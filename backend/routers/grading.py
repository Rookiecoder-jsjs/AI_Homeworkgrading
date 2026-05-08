import os
from fastapi import APIRouter, File, HTTPException, UploadFile

from config import UPLOAD_DIR
from database import get_db
from models import AnswerUpdate, CorrectRequest
from services.grader import grade_submission
from services.ocr import ocr_image

router = APIRouter(prefix="/api", tags=["grading"])


def _grade_one(conn, submission_id: int) -> bool:
    """Grade a single submission. Returns True on success. conn is NOT closed."""
    sub = conn.execute("SELECT * FROM submissions WHERE id = ?", [submission_id]).fetchone()
    if not sub:
        return False

    if sub["status"] == "grading":
        conn.execute("UPDATE submissions SET status = 'submitted' WHERE id = ?", [submission_id])
        conn.commit()

    conn.execute("UPDATE submissions SET status = 'grading' WHERE id = ?", [submission_id])
    conn.commit()

    # Global image OCR
    if sub["image_url"]:
        image_path = os.path.join(UPLOAD_DIR, os.path.basename(sub["image_url"]))
        if os.path.exists(image_path):
            try:
                for qid, text in ocr_image(image_path).items():
                    conn.execute(
                        "UPDATE answers SET student_answer = ? WHERE submission_id = ? AND question_id = ?",
                        [text, submission_id, qid],
                    )
            except Exception:
                pass
            conn.commit()

    # Per-question image OCR
    per_q = conn.execute(
        "SELECT id, question_id, image_url FROM answers WHERE submission_id = ? AND image_url != ''",
        [submission_id],
    ).fetchall()
    for row in per_q:
        img_path = os.path.join(UPLOAD_DIR, os.path.basename(row["image_url"]))
        if os.path.exists(img_path):
            try:
                results = ocr_image(img_path)
                text = list(results.values())[0] if results else ""
                if text:
                    conn.execute("UPDATE answers SET student_answer = ? WHERE id = ?", [text, row["id"]])
            except Exception:
                pass
    if per_q:
        conn.commit()

    # Grade each answer
    answers = conn.execute(
        "SELECT a.*, q.type, q.content, q.reference_answer, q.rubric, q.points "
        "FROM answers a JOIN questions q ON a.question_id = q.id "
        "WHERE a.submission_id = ?",
        [submission_id],
    ).fetchall()

    for ans in answers:
        try:
            result = grade_submission(
                question_type=ans["type"],
                question_content=ans["content"],
                reference_answer=ans["reference_answer"],
                rubric=ans["rubric"],
                student_answer=ans["student_answer"],
                max_points=ans["points"],
            )
        except Exception as e:
            result = {
                "is_correct": False, "confidence": 0.0, "score": 0,
                "feedback": f"[AI 批改暂不可用: {str(e)[:100]}]", "key_points": [],
            }
        conn.execute(
            "UPDATE answers SET is_correct=?, ai_confidence=?, ai_feedback=?, score=? WHERE id=?",
            [1 if result.get("is_correct") else 0, result.get("confidence", 0.5),
             result.get("feedback", ""), result.get("score", 0), ans["id"]],
        )

    conn.execute("UPDATE submissions SET status = 'graded' WHERE id = ?", [submission_id])
    conn.commit()
    return True


# ── single grading ────────────────────────────────────────

@router.post("/submissions/{submission_id}/grade")
def trigger_grading(submission_id: int):
    conn = get_db()
    ok = _grade_one(conn, submission_id)
    conn.close()
    if not ok:
        raise HTTPException(404, "提交不存在")
    return {"ok": True, "message": "批改完成"}


# ── batch grading ─────────────────────────────────────────

@router.post("/assignments/{assignment_id}/grade-all")
def trigger_batch_grading(assignment_id: int):
    conn = get_db()
    subs = conn.execute(
        "SELECT id FROM submissions WHERE assignment_id = ? AND status = 'submitted'",
        [assignment_id],
    ).fetchall()

    total = len(subs)
    done = 0
    for s in subs:
        try:
            _grade_one(conn, s["id"])
            done += 1
        except Exception:
            pass

    conn.close()
    return {"ok": True, "total": total, "graded": done, "message": f"批改完成: {done}/{total}"}


# ── teacher override ──────────────────────────────────────

@router.put("/answers/{answer_id}/override")
def override_answer(answer_id: int, data: AnswerUpdate):
    conn = get_db()
    ans = conn.execute("SELECT * FROM answers WHERE id = ?", [answer_id]).fetchone()
    if not ans:
        conn.close()
        raise HTTPException(404, "答案不存在")

    updates = {"teacher_override": 1}
    if data.is_correct is not None:
        updates["is_correct"] = 1 if data.is_correct else 0
    if data.score is not None:
        updates["score"] = data.score
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
    return {"ok": True}


# ── student correction ────────────────────────────────────

@router.post("/submissions/{submission_id}/correct")
def submit_correction(submission_id: int, data: CorrectRequest):
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
    return trigger_grading(submission_id)


# ── question OCR (teacher uploads question image) ─────────

@router.post("/ocr/question")
async def ocr_question(image: "UploadFile"):
    import base64, json, os, uuid
    from fastapi import File, UploadFile

    from config import UPLOAD_DIR
    from prompts.ocr import QUESTION_OCR_PROMPT
    from services.ai_client import chat_with_image

    ext = os.path.splitext(image.filename or ".png")[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await image.read())

    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    messages = [{"role": "system", "content": QUESTION_OCR_PROMPT}]
    raw = chat_with_image(messages, img_b64, temperature=0.1)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"questions": [{"content": raw, "type": "short_answer", "reference_answer": "", "points": 5}]}

    return {"image_url": f"/uploads/{filename}", "questions": data.get("questions", [])}


# ── ocr status ────────────────────────────────────────────

@router.post("/ocr/test")
def ocr_test():
    from config import DASHSCOPE_BASE_URL, MODEL_NAME
    return {
        "service": "OCR via qwen3.6-flash",
        "base_url": DASHSCOPE_BASE_URL,
        "model": MODEL_NAME,
        "status": "ready",
    }
