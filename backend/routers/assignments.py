from fastapi import APIRouter, HTTPException

from database import get_db
from models import AssignmentCreate, AssignmentDetail, AssignmentOut, QuestionOut

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


@router.post("", response_model=AssignmentDetail)
def create_assignment(data: AssignmentCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO assignments (title, subject, description, teacher_name, class_name, due_date, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [data.title, data.subject, data.description, data.teacher_name, data.class_name, data.due_date, data.status],
    )
    assignment_id = cur.lastrowid
    questions = []
    for q in data.questions:
        cur = conn.execute(
            "INSERT INTO questions (assignment_id, type, content, reference_answer, rubric, points, sort_order, image_url) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [assignment_id, q.type, q.content, q.reference_answer, q.rubric, q.points, q.sort_order, q.image_url],
        )
        questions.append(
            QuestionOut(
                id=cur.lastrowid,
                assignment_id=assignment_id,
                type=q.type,
                content=q.content,
                reference_answer=q.reference_answer,
                rubric=q.rubric,
                points=q.points,
                sort_order=q.sort_order,
                image_url=q.image_url,
            )
        )
    conn.commit()
    row = conn.execute("SELECT * FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    conn.close()
    return AssignmentDetail(
        id=row["id"],
        title=row["title"],
        subject=row["subject"],
        description=row["description"],
        teacher_name=row["teacher_name"],
        class_name=row["class_name"],
        due_date=row["due_date"],
        status=row["status"],
        created_at=row["created_at"],
        questions=questions,
    )


@router.get("", response_model=list[AssignmentOut])
def list_assignments(status: str = ""):
    conn = get_db()
    if status:
        rows = conn.execute("SELECT * FROM assignments WHERE status = ? ORDER BY created_at DESC", [status]).fetchall()
    else:
        rows = conn.execute("SELECT * FROM assignments ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{assignment_id}", response_model=AssignmentDetail)
def get_assignment(assignment_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "作业不存在")
    qrows = conn.execute(
        "SELECT * FROM questions WHERE assignment_id = ? ORDER BY sort_order", [assignment_id]
    ).fetchall()
    conn.close()
    return AssignmentDetail(
        id=row["id"],
        title=row["title"],
        subject=row["subject"],
        description=row["description"],
        teacher_name=row["teacher_name"],
        class_name=row["class_name"],
        due_date=row["due_date"],
        status=row["status"],
        created_at=row["created_at"],
        questions=[QuestionOut(**dict(q)) for q in qrows],
    )


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int):
    conn = get_db()
    conn.execute("DELETE FROM assignments WHERE id = ?", [assignment_id])
    conn.commit()
    conn.close()
    return {"ok": True}
