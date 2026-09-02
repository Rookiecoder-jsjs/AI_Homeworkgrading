from fastapi import APIRouter, Query

from database import db_session
from services.error_book import (
    add_to_error_book,
    auto_add_wrong_answers,
    get_error_book,
    get_error_book_stats,
    mark_as_reviewed,
)
from services.question_generator import generate_similar_question

router = APIRouter(prefix="/api/error-book", tags=["error-book"])


@router.get("")
def list_entries(
    student_name: str = Query(...),
    subject: str = "",
    kp: str = "",
    limit: int = 50,
    offset: int = 0,
):
    entries = get_error_book(student_name, subject, kp, limit, offset)
    # Enrich with question content
    with db_session(commit=False) as conn:
        for e in entries:
            q = conn.execute("SELECT content, type, reference_answer FROM questions WHERE id = ?", [e["question_id"]]).fetchone()
            if q:
                e["question_content"] = q["content"]
                e["question_type"] = q["type"]
                e["reference_answer"] = q["reference_answer"]
    return entries


@router.post("")
def add_entry(data: dict):
    result = add_to_error_book(data["student_name"], data["answer_id"])
    if not result:
        return {"ok": False, "message": "添加失败"}
    return {"ok": True, "entry": result}


@router.post("/{entry_id}/review")
def review_entry(entry_id: int):
    mark_as_reviewed(entry_id)
    return {"ok": True}


@router.post("/{entry_id}/similar-question")
async def generate_similar(entry_id: int):
    with db_session(commit=False) as conn:
        entry = conn.execute("SELECT * FROM error_book WHERE id = ?", [entry_id]).fetchone()
        if not entry:
            return {"ok": False, "message": "错题记录不存在"}
        q = conn.execute("SELECT content, type, reference_answer FROM questions WHERE id = ?", [entry["question_id"]]).fetchone()

    if not q:
        return {"ok": False, "message": "原题不存在"}

    result = await generate_similar_question(
        question_content=q["content"],
        question_type=q["type"],
        reference_answer=q["reference_answer"],
        wrong_answer=entry["wrong_answer"],
    )
    return {"ok": True, "similar_question": result}


@router.post("/sync")
def sync_errors(student_name: str = Query(...)):
    added = auto_add_wrong_answers(student_name)
    return {"ok": True, "added": added, "message": f"同步完成，新增 {added} 道错题"}


@router.get("/stats")
def stats(student_name: str = Query(...)):
    return get_error_book_stats(student_name)
