from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import csv
import io

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


@router.put("/{assignment_id}", response_model=AssignmentDetail)
def update_assignment(assignment_id: int, data: AssignmentCreate):
    conn = get_db()
    row = conn.execute("SELECT * FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "作业不存在")

    conn.execute(
        "UPDATE assignments SET title=?, subject=?, description=?, teacher_name=?, class_name=?, due_date=?, status=? WHERE id=?",
        [data.title, data.subject, data.description, data.teacher_name, data.class_name, data.due_date, data.status, assignment_id],
    )
    # Replace questions: delete old, insert new
    conn.execute("DELETE FROM questions WHERE assignment_id = ?", [assignment_id])
    questions = []
    for q in data.questions:
        cur = conn.execute(
            "INSERT INTO questions (assignment_id, type, content, reference_answer, rubric, points, sort_order, image_url) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [assignment_id, q.type, q.content, q.reference_answer, q.rubric, q.points, q.sort_order, q.image_url],
        )
        questions.append(QuestionOut(id=cur.lastrowid, assignment_id=assignment_id, **q.model_dump()))
    conn.commit()
    conn.close()
    return AssignmentDetail(
        id=assignment_id, title=data.title, subject=data.subject, description=data.description,
        teacher_name=data.teacher_name, class_name=data.class_name, due_date=data.due_date,
        status=data.status, created_at=row["created_at"], questions=questions,
    )


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int):
    conn = get_db()
    conn.execute("DELETE FROM assignments WHERE id = ?", [assignment_id])
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/{assignment_id}/export")
def export_grades(assignment_id: int):
    conn = get_db()
    asg = conn.execute("SELECT * FROM assignments WHERE id = ?", [assignment_id]).fetchone()
    if not asg:
        conn.close()
        raise HTTPException(404, "作业不存在")

    questions = conn.execute(
        "SELECT id, content, points, sort_order FROM questions WHERE assignment_id = ? ORDER BY sort_order",
        [assignment_id],
    ).fetchall()
    subs = conn.execute(
        "SELECT id, student_name, status FROM submissions WHERE assignment_id = ? ORDER BY submitted_at",
        [assignment_id],
    ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    header = ["学生姓名", "状态"]
    for q in questions:
        header.append(f"Q{q['sort_order'] + 1} ({q['points']}分)")
    header.extend(["总分", "正确数/总题数", "已复核数", "低置信度数"])
    writer.writerow(header)

    for sub in subs:
        answers = conn.execute(
            "SELECT a.score, a.is_correct, a.teacher_override, a.ai_confidence "
            "FROM answers a WHERE a.submission_id = ? ORDER BY a.id",
            [sub["id"]],
        ).fetchall()
        row = [sub["student_name"], sub["status"]]
        total_score = 0
        correct_count = 0
        reviewed = 0
        low_conf = 0
        for ans in answers:
            row.append(ans["score"])
            total_score += ans["score"] or 0
            if ans["is_correct"]:
                correct_count += 1
            if ans["teacher_override"]:
                reviewed += 1
            if (ans["ai_confidence"] or 1) < 0.7 and not ans["teacher_override"]:
                low_conf += 1
        row.extend([total_score, f"{correct_count}/{len(answers)}", reviewed, low_conf])
        writer.writerow(row)

    conn.close()
    output.seek(0)
    filename = f"{asg['title']}_成绩.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
