import asyncio
import base64
import logging
import mimetypes
import os
from pathlib import Path

from config import UPLOAD_DIR
from database import db_session, get_db
from fastapi import APIRouter, HTTPException, UploadFile
from models import AnswerUpdate, CorrectRequest
from prompts.ocr import QUESTION_OCR_PROMPT, REFERENCE_ANSWER_OCR_PROMPT
from services.ai_client import chat_with_image
from services.grader import grade_submission
from services.knowledge_graph import extract_knowledge_points, update_student_mastery
from services.ocr import ocr_image
from services.teacher_style import (
    update_teacher_style,
)
from utils import extract_json, save_upload, upload_path

router = APIRouter(prefix="/api", tags=["grading"])
logger = logging.getLogger("grading")


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
    img_path = upload_path(image_url, UPLOAD_DIR)
    try:
        results = await ocr_image(img_path)
    except Exception:
        logger.exception("OCR failed for submission %s image %s", submission_id, image_url)
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
    initial_status = sub["status"]

    cur = conn.execute(
        "UPDATE submissions SET status = 'grading' WHERE id = ? AND status IN ('submitted', 'corrected')",
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
        except Exception:
            logger.exception("AI grading failed for answer %s", ans["id"])
            return {
                "is_correct": False, "confidence": 0.0, "score": 0,
                "feedback": "[AI 批改暂不可用，请教师手动评阅]", "key_points": [],
            }

    results = await asyncio.gather(*[grade_one(ans) for ans in answers])
    for ans, result in zip(answers, results):
        conn.execute(
            "UPDATE answers SET is_correct=?, ai_confidence=?, ai_feedback=?, score=?, ai_score=? WHERE id=?",
            [1 if result.get("is_correct") else 0, result.get("confidence", 0.5),
             result.get("feedback", ""), result.get("score", 0), result.get("score", 0), ans["id"]],
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
                        "SELECT id FROM knowledge_points WHERE name = ? AND subject = ?",
                        [kp_name, subject],
                    ).fetchone()
                    if kp_id_row:
                        update_student_mastery(student_name, kp_id_row["id"], new_is_correct)
        except Exception:
            logger.exception(
                "Knowledge point extraction failed for submission %s answer %s",
                submission_id,
                ans["id"],
            )

    final_status = "corrected" if initial_status == "corrected" else "graded"
    conn.execute("UPDATE submissions SET status = ? WHERE id = ?", [final_status, submission_id])
    conn.commit()
    return True


# ── single grading ────────────────────────────────────────

@router.post("/submissions/{submission_id}/grade")
async def trigger_grading(submission_id: int):
    conn = get_db()
    current = conn.execute(
        "SELECT status FROM submissions WHERE id = ?", [submission_id]
    ).fetchone()
    previous_status = current["status"] if current else "submitted"
    try:
        ok = await _grade_one_async(conn, submission_id)
    except Exception as exc:
        logger.exception("Grading failed for submission %s", submission_id)
        conn.rollback()
        conn.execute(
            "UPDATE submissions SET status = ? WHERE id = ? AND status = 'grading'",
            [previous_status if previous_status in {"submitted", "corrected"} else "submitted", submission_id],
        )
        conn.commit()
        raise HTTPException(502, "批改失败，请稍后重试") from exc
    finally:
        conn.close()
    if not ok:
        raise HTTPException(404, "提交不存在或已在批改中")
    return {"ok": True, "message": "批改完成"}


# ── batch grading ─────────────────────────────────────────

@router.post("/assignments/{assignment_id}/grade-all")
async def trigger_batch_grading(assignment_id: int):
    conn = get_db()
    assignment = conn.execute(
        "SELECT id FROM assignments WHERE id = ?", [assignment_id]
    ).fetchone()
    if not assignment:
        conn.close()
        raise HTTPException(404, "作业不存在")
    subs = conn.execute(
        "SELECT id FROM submissions WHERE assignment_id = ? AND status = 'submitted'",
        [assignment_id],
    ).fetchall()
    conn.close()

    total = len(subs)
    errors = []

    semaphore = asyncio.Semaphore(4)

    async def grade_sub(sub_id):
        sub_conn = get_db()
        try:
            async with semaphore:
                ok = await _grade_one_async(sub_conn, sub_id)
            return ok
        except Exception:
            logger.exception("Batch grading failed for submission %s", sub_id)
            sub_conn.rollback()
            sub_conn.execute(
                "UPDATE submissions SET status = 'submitted' WHERE id = ? AND status = 'grading'",
                [sub_id],
            )
            sub_conn.commit()
            errors.append({"id": sub_id, "error": "批改失败，请重试"})
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

    q_row = conn.execute(
        "SELECT q.type, q.points, a_sub.teacher_name "
        "FROM questions q "
        "JOIN answers a2 ON q.id = a2.question_id "
        "JOIN submissions s2 ON a2.submission_id = s2.id "
        "JOIN assignments a_sub ON s2.assignment_id = a_sub.id "
        "WHERE a2.id = ?",
        [answer_id],
    ).fetchone()
    if not q_row:
        conn.close()
        raise HTTPException(404, "答案对应的题目不存在")
    if data.score is not None and data.score > q_row["points"]:
        conn.close()
        raise HTTPException(422, f"得分不能超过本题满分 {q_row['points']} 分")

    # Preserve the original AI score across repeated teacher edits. Older rows
    # may not have ai_score populated, so fall back to the current score only
    # on the first override when the migrated value is still zero.
    if ans["teacher_override"]:
        ai_original_score = ans["ai_score"] if ans["ai_score"] is not None else ans["score"]
    else:
        ai_original_score = ans["ai_score"] if ans["ai_score"] or ans["score"] == 0 else ans["score"]
    conn.execute("UPDATE answers SET ai_score = ? WHERE id = ?", [ai_original_score, answer_id])

    updates = {"teacher_override": 1}
    teacher_score = ai_original_score
    if data.is_correct is not None:
        updates["is_correct"] = 1 if data.is_correct else 0
        if data.score is None:
            inferred_score = q_row["points"] if data.is_correct else 0
            updates["score"] = inferred_score
            teacher_score = inferred_score
    if data.score is not None:
        updates["score"] = data.score
        teacher_score = data.score
    if data.teacher_comment is not None:
        updates["teacher_comment"] = data.teacher_comment

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [answer_id]
    conn.execute(f"UPDATE answers SET {set_clause} WHERE id = ?", values)

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
    if sub["status"] not in {"graded", "reviewed", "corrected"}:
        conn.close()
        raise HTTPException(409, "当前提交还不能订正")

    conn.execute("UPDATE submissions SET status = 'corrected' WHERE id = ?", [submission_id])
    for item in data.answers:
        answer_row = conn.execute(
            "SELECT id FROM answers WHERE submission_id = ? AND question_id = ?",
            [submission_id, item.question_id],
        ).fetchone()
        if not answer_row:
            conn.close()
            raise HTTPException(400, "订正答案包含不属于该提交的题目")
        conn.execute(
            """UPDATE answers SET student_answer=?, is_correct=NULL, ai_confidence=NULL,
               ai_feedback='', score=0, teacher_override=0, teacher_comment='', ai_score=0
               WHERE id=?""",
            [item.student_answer, answer_row["id"]],
        )
    conn.commit()
    conn.close()
    return await trigger_grading(submission_id)


# ── question OCR (teacher uploads question image) ─────────

@router.post("/ocr/question")
async def ocr_question(image: UploadFile):
    image_url = await save_upload(image, UPLOAD_DIR)
    filepath = os.path.join(UPLOAD_DIR, os.path.basename(image_url.lstrip("/")))

    image_bytes = await asyncio.to_thread(Path(filepath).read_bytes)
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")

    messages = [{"role": "system", "content": QUESTION_OCR_PROMPT}]
    mime_type = mimetypes.guess_type(filepath)[0] or "image/png"
    raw = await chat_with_image(messages, img_b64, temperature=0.1, image_mime_type=mime_type)
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

    image_bytes = await asyncio.to_thread(Path(filepath).read_bytes)
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")

    messages = [{"role": "system", "content": REFERENCE_ANSWER_OCR_PROMPT}]
    mime_type = mimetypes.guess_type(filepath)[0] or "image/png"
    raw = await chat_with_image(messages, img_b64, temperature=0.1, image_mime_type=mime_type)
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
    except Exception as e:  # noqa: BLE001 - health endpoint must report upstream failures
        return {
            "service": "OCR via DashScope chat",
            "base_url": DASHSCOPE_BASE_URL,
            "model": MODEL_NAME,
            "status": "error",
            "error": str(e)[:200],
        }
