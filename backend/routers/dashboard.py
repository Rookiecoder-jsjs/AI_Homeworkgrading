from fastapi import APIRouter

from database import get_db
from models import StudentDashboard, TeacherDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/teacher", response_model=TeacherDashboard)
def teacher_dashboard():
    conn = get_db()
    total_assignments = conn.execute("SELECT COUNT(*) as cnt FROM assignments").fetchone()["cnt"]
    total_submissions = conn.execute("SELECT COUNT(*) as cnt FROM submissions").fetchone()["cnt"]
    graded = conn.execute(
        "SELECT COUNT(*) as cnt FROM submissions WHERE status IN ('graded','reviewed','corrected')"
    ).fetchone()["cnt"]
    pending = conn.execute(
        "SELECT COUNT(*) as cnt FROM answers WHERE ai_confidence < 0.7 AND teacher_override = 0"
    ).fetchone()["cnt"]
    avg_score = conn.execute(
        "SELECT COALESCE(AVG(score), 0) as avg FROM answers WHERE score > 0"
    ).fetchone()["avg"]
    conn.close()
    return TeacherDashboard(
        total_assignments=total_assignments,
        total_submissions=total_submissions,
        graded_count=graded,
        pending_review_count=pending,
        average_score=round(avg_score, 1),
    )


@router.get("/student", response_model=StudentDashboard)
def student_dashboard(name: str = ""):
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as cnt FROM assignments WHERE status = 'published'").fetchone()["cnt"]

    if name:
        completed = conn.execute(
            "SELECT COUNT(DISTINCT assignment_id) as cnt FROM submissions WHERE student_name = ?",
            [name],
        ).fetchone()["cnt"]
        avg = conn.execute(
            """SELECT COALESCE(AVG(a.score), 0) as avg FROM answers a
               JOIN submissions s ON a.submission_id = s.id
               WHERE s.student_name = ? AND a.score > 0""",
            [name],
        ).fetchone()["avg"]
    else:
        completed = conn.execute(
            "SELECT COUNT(DISTINCT assignment_id) as cnt FROM submissions"
        ).fetchone()["cnt"]
        avg = conn.execute("SELECT COALESCE(AVG(score), 0) as avg FROM answers WHERE score > 0").fetchone()["avg"]

    conn.close()
    return StudentDashboard(
        total_assignments=total,
        completed_count=completed,
        average_score=round(avg, 1),
        weak_points=[],
    )


@router.get("/review-queue")
def review_queue():
    """Submissions that have low-confidence answers needing teacher review."""
    conn = get_db()
    rows = conn.execute(
        """SELECT DISTINCT s.id, s.assignment_id, s.student_name, s.status, s.submitted_at,
                  a_sub.title as assignment_title,
                  COUNT(ans.id) as low_conf_count
           FROM submissions s
           JOIN answers ans ON ans.submission_id = s.id
           JOIN assignments a_sub ON s.assignment_id = a_sub.id
           WHERE ans.ai_confidence < 0.7 AND ans.teacher_override = 0
           GROUP BY s.id
           ORDER BY s.submitted_at DESC"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
