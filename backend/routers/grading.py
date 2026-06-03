import asyncio
import base64
import json
import os
import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile

from config import UPLOAD_DIR
from database import db_session, get_db
from models import AnswerUpdate, CorrectRequest
from prompts.ocr import QUESTION_OCR_PROMPT, REFERENCE_ANSWER_OCR_PROMPT
from services.ai_client import chat_with_image
from services.grader import grade_submission
from services.knowledge_graph import extract_knowledge_points, update_student_mastery
from services.ocr import ocr_image
from services.teacher_style import get_teacher_bias, update_teacher_style, apply_correction
from utils import extract_json, save_upload, upload_path

router = APIRouter(prefix="/api", tags=["grading"])


async def _ocr_and_update(submission_id: int, image_url: str, answer_id: int | None = None):
    """Run OCR on a single image and update the database.

    Opens its own SQLite connection so parallel OCR tasks don't contend on a
    shared connection during ``asyncio.gather``.

    - Per-question image (answer_id given): write the first OCR result to that
      answer. If OCR returns multiple questions we log a warning — the image
      was meant to be one question only.
    - Global image (answer_id None): OCR returns {question_number: text}.
      Map question_number → real question_id via the assignment's question
      order, since `question_id` is autoincrement and not equal to the
      displayed question number.
    """
    import logging
    logger = logging.getLogger("grading")
    img_path = upload_path(image_url, UPLOAD_DIR)
    try:
        results = await ocr_image(img_path)
    except Exception:
        return
    if not results:
        return
    with db_session() as conn:
        if answer_id is not None:
            if len(results) > 1:
                logger.warning(
                    "Per-question image for answer %s returned %d questions; using first",
                    answer_id, len(results),
                )
            text = next(iter(results.values()))
            if text:
                conn.execute(
                    "UPDATE answers SET student_answer = ? WHERE id = ?",
                    [text, answer_id],
                )
        else:
            qrows = conn.execute(
                "SELECT q.id FROM questions q "
                "JOIN submissions s ON s.assignment_id = q.assignment_id "
                "WHERE s.id = ? ORDER BY q.sort_order, q.id",
                [submission_id],
            ).fetchall()
            qid_by_number = {i + 1: row["id"] for i, row in enumerate(qrows)}
            for q_num, text in results.items():
                real_qid = qid_by_number.get(int(q_num))
                if real_qid is None:
                    logger.warning(
                        "OCR returned question_number %s but assignment only has %d",
                        q_num, len(qrows),
                    )
                    continue
                conn.execute(
                    "UPDATE answers SET student_answer = ? WHERE submission_id = ? AND question_id = ?",
                    [text, submission_id, real_qid],
                )


async def _grade_one_async(conn, submission_id: int) -> bool:
    """Grade a single submission with parallel OCR and grading. conn is NOT closed."""
    sub = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    if not sub:
        return False

    cur = conn.execute(
        "UPDATE submissions SET status = 'grading' WHERE id = ? AND status = 'submitted'",
        [submission_id],
    )
    conn.commit()
    if cur.rowcount == 0:
        return False

    # Run all OCR tasks in parallel
    ocr_tasks = []
    if sub["image_url"]:
        ocr_tasks.append(_ocr_and_update(submission_id, sub["image_url"]))

    per_q = conn.execute(
        "SELECT id, question_id, image_url FROM answers WHERE submission_id = ? AND image_url != ''",
        [submission_id],
    ).fetchall()
    for row in per_q:
        ocr_tasks.append(_ocr_and_update(submission_id, row["image_url"], row["id"]))

    if ocr_tasks:
        await asyncio.gather(*ocr_tasks)
        # OCR tasks wrote via their own connections; nothing to commit here.

    # Grade each answer in parallel
    answers = conn.execute(
        "SELECT a.*, q.type, q.content, q.reference_answer, q.rubric, q.points "
        "FROM answers a JOIN questions q ON a.question_id = q.id "
        "WHERE a.submission_id = ?",
        [submission_id],
    ).fetchall()

    async def grade_one(ans):
        try:
            return await grade_submission(
                question_type=ans["type"],
                question_content=ans["content"],
                reference_answer=ans["reference_answer"],
                rubric=ans["rubric"],
                student_answer=ans["student_answer"],
                max_points=ans["points"],
            )
        except Exception as e:
            return {
                "is_correct": False, "confidence": 0.0, "score": 0,
                "feedback": f"[AI 批改暂不可用: {str(e)[:100]}]", "key_points": [],
            }

    results = await asyncio.gather(*[grade_one(ans) for ans in answers])
    for ans, result in zip(answers, results):
        conn.execute(
            "UPDATE answers SET is_correct=?, ai_confidence=?, ai_feedback=?, score=? WHERE id=?",
            [1 if result.get("is_correct") else 0, result.get("confidence", 0.5),
             result.get("feedback", ""), result.get("score", 0), ans["id"]],
        )

    # Extract knowledge points for each question and update student mastery
    sub = conn.execute("SELECT student_name FROM submissions WHERE id = ?", [submission_id]).fetchone()
    student_name = sub["student_name"] if sub else ""
    subject = conn.execute(
        "SELECT subject FROM assignments WHERE id = (SELECT assignment_id FROM submissions WHERE id = ?)",
        [submission_id],
    ).fetchone()
    subject = subject["subject"] or "" if subject else ""
    for ans, result in zip(answers, results):
        # Use the NEW AI-graded is_correct (from `result`), not the stale value in `ans`.
        new_is_correct = bool(result.get("is_correct"))
        try:
            kps = await extract_knowledge_points(
                ans["question_id"], ans["content"],
                subject,
                ans["type"],
            )
            for kp in kps:
                kp_name = kp.get("name", "").strip()
                if kp_name and student_name:
                    kp_id_row = conn.execute(
                        "SELECT id FROM knowledge_points WHERE name = ?", [kp_name]
                    ).fetchone()
                    if kp_id_row:
                        update_student_mastery(student_name, kp_id_row["id"], new_is_correct)
        except Exception:
            pass  # KP extraction failure should not block grading

    conn.execute("UPDATE submissions SET status = 'graded' WHERE id = ?", [submission_id])
    conn.commit()
    return True


# ── single grading ────────────────────────────────────────

@router.post("/submissions/{submission_id}/grade")
async def trigger_grading(submission_id: int):
    conn = get_db()
    ok = await _grade_one_async(conn, submission_id)
    conn.close()
    if not ok:
        raise HTTPException(404, "提交不存在或已在批改中")
    return {"ok": True, "message": "批改完成"}


# ── batch grading ─────────────────────────────────────────

@router.post("/assignments/{assignment_id}/grade-all")
async def trigger_batch_grading(assignment_id: int):
    conn = get_db()
    subs = conn.execute(
        "SELECT id FROM submissions WHERE assignment_id = ? AND status = 'submitted'",
        [assignment_id],
    ).fetchall()
    conn.close()

    total = len(subs)
    errors = []

    async def grade_sub(sub_id):
        sub_conn = get_db()
        try:
            ok = await _grade_one_async(sub_conn, sub_id)
            return ok
        except Exception as e:
            errors.append({"id": sub_id, "error": str(e)[:100]})
            return False
        finally:
            sub_conn.close()

    results = await asyncio.gather(*[grade_sub(s["id"]) for s in subs])
    done = sum(1 for r in results if r)

    return {"ok": True, "total": total, "graded": done, "message": f"批改完成: {done}/{total}", "errors": errors}


# ── teacher override ──────────────────────────────────────

@router.put("/answers/{answer_id}/override")
def override_answer(answer_id: int, data: AnswerUpdate):
    conn = get_db()
    ans = conn.execute("SELECT * FROM answers WHERE id = ?", [answer_id]).fetchone()
    if not ans:
        conn.close()
        raise HTTPException(404, "答案不存在")

    # Preserve original AI score before override
    ai_original_score = ans["score"]
    conn.execute("UPDATE answers SET ai_score = ? WHERE id = ?", [ai_original_score, answer_id])

    updates = {"teacher_override": 1}
    teacher_score = ai_original_score
    if data.is_correct is not None:
        updates["is_correct"] = 1 if data.is_correct else 0
    if data.score is not None:
        updates["score"] = data.score
        teacher_score = data.score
    if data.teacher_comment is not None:
        updates["teacher_comment"] = data.teacher_comment

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [answer_id]
    conn.execute(f"UPDATE answers SET {set_clause} WHERE id = ?", values)

    # Get question type and teacher name for style tracking
    q_row = conn.execute(
        "SELECT q.type, a_sub.teacher_name FROM questions q JOIN answers a2 ON q.id = a2.question_id JOIN submissions s2 ON a2.submission_id = s2.id JOIN assignments a_sub ON s2.assignment_id = a_sub.id WHERE a2.id = ?",
        [answer_id],
    ).fetchone()

    sub_id = ans["submission_id"]
    unreviewed = conn.execute(
        "SELECT COUNT(*) as cnt FROM answers WHERE submission_id = ? AND teacher_override = 0",
        [sub_id],
    ).fetchone()["cnt"]
    if unreviewed == 0:
        conn.execute("UPDATE submissions SET status = 'reviewed' WHERE id = ?", [sub_id])

    conn.commit()
    conn.close()

    # Update teacher style profile (after commit)
    if q_row:
        update_teacher_style(q_row["teacher_name"], q_row["type"], ai_original_score, teacher_score)

    return {"ok": True}


# ── student correction ────────────────────────────────────

@router.post("/submissions/{submission_id}/correct")
async def submit_correction(submission_id: int, data: CorrectRequest):
    conn = get_db()
    sub = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    if not sub:
        conn.close()
        raise HTTPException(404, "提交不存在")

    conn.execute("UPDATE submissions SET status = 'corrected' WHERE id = ?", [submission_id])
    for item in data.answers:
        conn.execute(
            "UPDATE answers SET student_answer = ? WHERE submission_id = ? AND question_id = ?",
            [item.get("student_answer", ""), submission_id, item.get("question_id")],
        )
    conn.commit()
    conn.close()
    return await trigger_grading(submission_id)


# ── question OCR (teacher uploads question image) ─────────

@router.post("/ocr/question")
async def ocr_question(image: UploadFile):
    image_url = await save_upload(image, UPLOAD_DIR)
    filepath = os.path.join(UPLOAD_DIR, os.path.basename(image_url.lstrip("/")))

    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    messages = [{"role": "system", "content": QUESTION_OCR_PROMPT}]
    raw = await chat_with_image(messages, img_b64, temperature=0.1)
    data = extract_json(raw)
    if not data:
        data = {"questions": [{"content": raw, "type": "short_answer", "reference_answer": "", "points": 5}]}

    return {"image_url": image_url, "questions": data.get("questions", [])}


# ── reference answer OCR (teacher uploads answer image) ─────

@router.post("/ocr/reference-answer")
async def ocr_reference_answer(image: UploadFile):
    """OCR a teacher-provided reference answer image into clean text."""
    image_url = await save_upload(image, UPLOAD_DIR)
    filepath = os.path.join(UPLOAD_DIR, os.path.basename(image_url.lstrip("/")))

    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    messages = [{"role": "system", "content": REFERENCE_ANSWER_OCR_PROMPT}]
    raw = await chat_with_image(messages, img_b64, temperature=0.1)
    data = extract_json(raw)
    if not data:
        data = {"reference_answer": raw}

    return {"image_url": image_url, "reference_answer": data.get("reference_answer", "")}


# ── ocr status ────────────────────────────────────────────

@router.get("/ocr/health")
async def ocr_health():
    """Verify DashScope connectivity with a minimal ping."""
    from config import DASHSCOPE_BASE_URL, MODEL_NAME
    from services.ai_client import chat
    try:
        reply = await chat(
            [{"role": "user", "content": "ping"}],
            temperature=0.0,
            max_tokens=8,
        )
        return {
            "service": "OCR via DashScope chat",
            "base_url": DASHSCOPE_BASE_URL,
            "model": MODEL_NAME,
            "status": "ok",
            "ping_reply": reply[:80],
        }
    except Exception as e:
        return {
            "service": "OCR via DashScope chat",
            "base_url": DASHSCOPE_BASE_URL,
            "model": MODEL_NAME,
            "status": "error",
            "error": str(e)[:200],
        }
