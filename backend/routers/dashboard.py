from fastapi import APIRouter, Query

from database import db_session
from models import StudentDashboard, TeacherDashboard, TeacherStyleReport
from services.knowledge_graph import compute_root_causes, get_student_mastery_map
from services.teacher_style import get_teacher_style_report

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/teacher", response_model=TeacherDashboard)
def teacher_dashboard():
    with db_session(commit=False) as conn:
        row = conn.execute(
            """SELECT
               (SELECT COUNT(*) FROM assignments) as total_assignments,
               (SELECT COUNT(*) FROM submissions) as total_submissions,
               (SELECT COUNT(*) FROM submissions WHERE status IN ('graded','reviewed','corrected')) as graded,
               (SELECT COUNT(*) FROM answers WHERE ai_confidence < 0.7 AND teacher_override = 0) as pending,
               (SELECT COALESCE(AVG(score), 0) FROM answers WHERE score > 0) as avg_score"""
        ).fetchone()
    return TeacherDashboard(
        total_assignments=row["total_assignments"],
        total_submissions=row["total_submissions"],
        graded_count=row["graded"],
        pending_review_count=row["pending"],
        average_score=round(row["avg_score"], 1),
    )


@router.get("/student", response_model=StudentDashboard)
def student_dashboard(name: str = ""):
    with db_session(commit=False) as conn:
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

    # Knowledge-graph-based weak point analysis
    mastery_map = get_student_mastery_map(name) if name else {}
    weak_points = sorted(mastery_map, key=mastery_map.get)[:5]
    weak_point_details = [
        {"knowledge_point_name": kp, "mastery_score": round(mastery_map[kp], 2)}
        for kp in weak_points
    ]

    return StudentDashboard(
        total_assignments=total,
        completed_count=completed,
        average_score=round(avg, 1),
        weak_points=weak_points,
        weak_point_details=weak_point_details,
    )


@router.get("/knowledge-graph/{subject}")
def knowledge_graph(subject: str):
    """Return the full knowledge point dependency tree for a subject."""
    with db_session(commit=False) as conn:
        rows = conn.execute(
            "SELECT id, name, parent_id, description FROM knowledge_points WHERE subject = ? ORDER BY name",
            [subject],
        ).fetchall()
    nodes = {r["id"]: {"id": r["id"], "name": r["name"], "parent_id": r["parent_id"], "description": r["description"], "children": []} for r in rows}

    roots = []
    for r in rows:
        if r["parent_id"] and r["parent_id"] in nodes:
            nodes[r["parent_id"]]["children"].append(nodes[r["id"]])
        else:
            roots.append(nodes[r["id"]])
    return {"subject": subject, "roots": roots}


@router.get("/student/{name}/diagnosis")
def student_diagnosis(name: str):
    """Deep diagnosis: root cause analysis for a student's weak points."""
    with db_session(commit=False) as conn:
        # Get all wrong question IDs for this student
        wrong_qids = [
            r["question_id"] for r in conn.execute(
                """SELECT a.question_id FROM answers a
                   JOIN submissions s ON a.submission_id = s.id
                   WHERE s.student_name = ? AND a.is_correct = 0""",
                [name],
            ).fetchall()
        ]

    root_causes = compute_root_causes(wrong_qids) if wrong_qids else []
    mastery_map = get_student_mastery_map(name)

    return {
        "student_name": name,
        "wrong_question_count": len(wrong_qids),
        "root_causes": root_causes,
        "mastery": {k: round(v, 2) for k, v in sorted(mastery_map.items(), key=lambda x: x[1])},
    }


# ── Class Analytics ───────────────────────────────────────

from services.class_analytics import compare_classes, get_class_stats, get_knowledge_heatmap, get_trends


@router.get("/class-overview")
def class_overview(teacher_name: str = ""):
    return get_class_stats(teacher_name)


@router.get("/class-comparison")
def class_comparison(class_a: str, class_b: str):
    return compare_classes(class_a, class_b)


@router.get("/knowledge-heatmap")
def knowledge_heatmap(class_name: str):
    return get_knowledge_heatmap(class_name)


@router.get("/trends")
def class_trends(class_name: str, weeks: int = 8):
    return get_trends(class_name, weeks)


# ── Teacher Style ─────────────────────────────────────────

@router.get("/teacher-style/{teacher_name}", response_model=TeacherStyleReport)
def teacher_style(teacher_name: str):
    return get_teacher_style_report(teacher_name)


# ── Review Queue ───────────────────────────────────────────

@router.get("/review-queue")
def review_queue():
    """Submissions that have low-confidence answers needing teacher review."""
    with db_session(commit=False) as conn:
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
    return [dict(r) for r in rows]
