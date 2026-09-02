import json

from config import UPLOAD_DIR
from database import get_db
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from models import AnswerOut, QuestionOut, SubmissionDetail
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
    image: UploadFile | None = File(None),  # noqa: B008 - FastAPI form metadata
    question_images: list[UploadFile] = File([]),  # noqa: B008 - FastAPI form metadata
    question_image_ids: list[str] = Form([]),  # noqa: B008 - FastAPI form metadata
    answers_json: str = Form("[]"),
):
    conn = get_db()
    student_name = student_name.strip()
    if not student_name or len(student_name) > 100:
        conn.close()
        raise HTTPException(422, "学生姓名不能为空且不能超过 100 个字符")

    asg = conn.execute("SELECT id, status FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    if not asg:
        conn.close()
        raise HTTPException(404, "作业不存在")
    if asg["status"] != "published":
        conn.close()
        raise HTTPException(409, "该作业尚未发布或已关闭")

    assignment_questions = conn.execute(
        "SELECT id FROM questions WHERE assignment_id = ? ORDER BY sort_order", [assignment_id]
    ).fetchall()
    allowed_question_ids = {row["id"] for row in assignment_questions}

    try:
        answer_items = json.loads(answers_json)
    except json.JSONDecodeError:
        conn.close()
        raise HTTPException(400, "answers_json 不是有效的 JSON")
    if not isinstance(answer_items, list):
        conn.close()
        raise HTTPException(400, "answers_json 必须是数组")

    normalized_answers = []
    seen_question_ids = set()
    for item in answer_items:
        if not isinstance(item, dict):
            conn.close()
            raise HTTPException(400, "答案格式不正确")
        try:
            question_id = int(item.get("question_id"))
        except (TypeError, ValueError):
            conn.close()
            raise HTTPException(400, "答案缺少有效的 question_id")
        if question_id not in allowed_question_ids:
            conn.close()
            raise HTTPException(400, "答案包含不属于该作业的题目")
        if question_id in seen_question_ids:
            conn.close()
            raise HTTPException(400, "同一道题不能重复提交")
        seen_question_ids.add(question_id)
        student_answer = item.get("student_answer", "")
        if not isinstance(student_answer, str) or len(student_answer) > 20_000:
            conn.close()
            raise HTTPException(422, "单题答案不能为空或不能超过 20,000 个字符")
        normalized_answers.append({"question_id": question_id, "student_answer": student_answer})

    # FastAPI collects repeated multipart fields as a list. Flatten comma-separated
    # values too, so older clients remain compatible.
    q_image_ids = [
        part.strip()
        for raw_id in question_image_ids
        for part in raw_id.split(",")
        if part.strip()
    ]
    if question_images and len(q_image_ids) != len(question_images):
        conn.close()
        raise HTTPException(400, "题目图片与题目 ID 数量不一致")
    for qid in q_image_ids:
        try:
            qid_int = int(qid)
        except ValueError:
            conn.close()
            raise HTTPException(400, "题目图片包含无效的题目 ID")
        if qid_int not in allowed_question_ids:
            conn.close()
            raise HTTPException(400, "题目图片不属于该作业")
        if qid_int not in seen_question_ids:
            conn.close()
            raise HTTPException(400, "题目图片没有对应的答案")

    if not normalized_answers and not (image and image.filename):
        conn.close()
        raise HTTPException(400, "请至少填写一道题或上传作业图片")

    # Save global image if provided (backwards compat)
    image_url = ""
    if image and image.filename:
        image_url = await save_upload(image, UPLOAD_DIR)

    cur = conn.execute(
        "INSERT INTO submissions (assignment_id, student_name, image_url) VALUES (?, ?, ?)",
        [assignment_id, student_name, image_url],
    )
    submission_id = cur.lastrowid

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
        for item in normalized_answers:
            qid = str(item["question_id"])
            img_url = q_image_map.get(qid, "")
            conn.execute(
                "INSERT INTO answers (submission_id, question_id, student_answer, image_url) VALUES (?, ?, ?, ?)",
                [submission_id, item["question_id"], item["student_answer"], img_url],
            )

    conn.commit()
    sub_row = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    result = _build_submission_detail(sub_row, conn)
    conn.close()
    return result


@router.get("", response_model=list[dict])
def list_submissions(assignment_id: int | None = None, student_name: str | None = None):
    conn = get_db()
    conditions = []
    params: list[object] = []
    if assignment_id:
        conditions.append("assignment_id = ?")
        params.append(assignment_id)
    normalized_student_name = student_name.strip() if student_name else ""
    if normalized_student_name:
        conditions.append("student_name = ?")
        params.append(normalized_student_name)
    where_clause = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = conn.execute(
        f"SELECT * FROM submissions{where_clause} ORDER BY submitted_at DESC", params
    ).fetchall()

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
