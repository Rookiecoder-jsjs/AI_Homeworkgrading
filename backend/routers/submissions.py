import json
import os
import uuid
from typing import Optional, List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from config import UPLOAD_DIR
from database import get_db
from models import AnswerOut, QuestionOut, SubmissionDetail, SubmissionOut
from utils import save_upload

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

PENDING_OCR_PLACEHOLDER = "[待 OCR 识别]"


def _build_submission_detail(sub_row, conn) -> SubmissionDetail:
    answers = conn.execute(
        "SELECT * FROM answers WHERE submission_id = ? ORDER BY id", [sub_row["id"]]
    ).fetchall()
    question_ids = [a["question_id"] for a in answers]
    questions = {}
    if question_ids:
        placeholders = ",".join("?" for _ in question_ids)
        qrows = conn.execute(
            f"SELECT * FROM questions WHERE id IN ({placeholders}) ORDER BY sort_order",
            question_ids,
        ).fetchall()
        questions = {q["id"]: QuestionOut(**dict(q)) for q in qrows}
    return SubmissionDetail(
        id=sub_row["id"],
        assignment_id=sub_row["assignment_id"],
        student_name=sub_row["student_name"],
        status=sub_row["status"],
        image_url=sub_row["image_url"],
        submitted_at=sub_row["submitted_at"],
        answers=[AnswerOut(**dict(a)) for a in answers],
        questions=[questions.get(a["question_id"]) for a in answers if a["question_id"] in questions],
    )


@router.post("", response_model=SubmissionDetail)
async def submit_assignment(
    assignment_id: int = Form(...),
    student_name: str = Form(...),
    image: Optional[UploadFile] = File(None),
    question_images: List[UploadFile] = File([]),
    question_image_ids: str = Form(""),
    answers_json: str = Form("[]"),
):
    conn = get_db()
    asg = conn.execute("SELECT id FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    if not asg:
        conn.close()
        raise HTTPException(404, "作业不存在")

    # Save global image if provided (backwards compat)
    image_url = ""
    if image and image.filename:
        image_url = await save_upload(image, UPLOAD_DIR)

    cur = conn.execute(
        "INSERT INTO submissions (assignment_id, student_name, image_url) VALUES (?, ?, ?)",
        [assignment_id, student_name, image_url],
    )
    submission_id = cur.lastrowid

    # Parse answers
    try:
        answer_items = json.loads(answers_json)
    except json.JSONDecodeError:
        answer_items = []

    # Parse per-question image ID mapping
    q_image_ids = question_image_ids.split(",") if question_image_ids else []

    # Save per-question images → map question_id → image_url
    q_image_map: dict[str, str] = {}
    for i, qimg in enumerate(question_images):
        if qimg and qimg.filename:
            qid = q_image_ids[i] if i < len(q_image_ids) else ""
            if qid:
                q_image_map[qid] = await save_upload(qimg, UPLOAD_DIR)

    # If no text answers but global image was uploaded, create placeholder answers for each question
    if not answer_items and image_url:
        questions = conn.execute(
            "SELECT id FROM questions WHERE assignment_id = ? ORDER BY sort_order", [assignment_id]
        ).fetchall()
        for q in questions:
            conn.execute(
                "INSERT INTO answers (submission_id, question_id, student_answer) VALUES (?, ?, ?)",
                [submission_id, q["id"], PENDING_OCR_PLACEHOLDER],
            )
    else:
        for item in answer_items:
            qid = str(item.get("question_id"))
            img_url = q_image_map.get(qid, "")
            conn.execute(
                "INSERT INTO answers (submission_id, question_id, student_answer, image_url) VALUES (?, ?, ?, ?)",
                [submission_id, item.get("question_id"), item.get("student_answer", ""), img_url],
            )

    conn.commit()
    sub_row = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    result = _build_submission_detail(sub_row, conn)
    conn.close()
    return result


@router.get("", response_model=list[dict])
def list_submissions(assignment_id: Optional[int] = None):
    conn = get_db()
    if assignment_id:
        rows = conn.execute(
            "SELECT * FROM submissions WHERE assignment_id = ? ORDER BY submitted_at DESC",
            [assignment_id],
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM submissions ORDER BY submitted_at DESC").fetchall()

    if not rows:
        conn.close()
        return []

    # Single query to get all stats for all submissions at once
    sub_ids = [r["id"] for r in rows]
    placeholders = ",".join("?" for _ in sub_ids)
    stats = conn.execute(
        f"""SELECT
               submission_id,
               SUM(CASE WHEN ai_confidence < 0.7 AND teacher_override = 0 THEN 1 ELSE 0 END) as low_conf_count,
               SUM(CASE WHEN ai_confidence > 0.9 AND teacher_override = 0 THEN 1 ELSE 0 END) as high_conf_count,
               SUM(CASE WHEN teacher_override = 1 THEN 1 ELSE 0 END) as reviewed_count,
               COUNT(*) as total_answers
             FROM answers
             WHERE submission_id IN ({placeholders})
             GROUP BY submission_id""",
        sub_ids,
    ).fetchall()
    stats_map = {s["submission_id"]: dict(s) for s in stats}

    result = []
    for r in rows:
        d = dict(r)
        s = stats_map.get(r["id"], {})
        d["low_conf_count"] = s.get("low_conf_count", 0)
        d["high_conf_count"] = s.get("high_conf_count", 0)
        d["reviewed_count"] = s.get("reviewed_count", 0)
        d["total_answers"] = s.get("total_answers", 0)
        result.append(d)

    conn.close()
    return result


@router.get("/{submission_id}", response_model=SubmissionDetail)
def get_submission(submission_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "提交不存在")
    result = _build_submission_detail(row, conn)
    conn.close()
    return result
