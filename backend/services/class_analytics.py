from database import get_db


def get_class_stats(teacher_name: str = "") -> list[dict]:
    """Per-class aggregate stats."""
    conn = get_db()
    query = """SELECT a.class_name,
                      COUNT(DISTINCT s.id) as student_count,
                      COUNT(DISTINCT s.student_name) as unique_students,
                      COALESCE(AVG(ans.score), 0) as avg_score,
                      CAST(SUM(CASE WHEN s.status IN ('graded','reviewed','corrected') THEN 1 ELSE 0 END) AS REAL) / MAX(1, COUNT(*)) as completion_rate
               FROM assignments a
               LEFT JOIN submissions s ON s.assignment_id = a.id
               LEFT JOIN answers ans ON ans.submission_id = s.id
               WHERE a.class_name != ''"""
    params = []
    if teacher_name:
        query += " AND a.teacher_name = ?"
        params.append(teacher_name)
    query += " GROUP BY a.class_name ORDER BY avg_score DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_knowledge_heatmap(class_name: str) -> list[dict]:
    """Knowledge point mastery heatmap for a class. Falls back to answers data if no student_mastery."""
    conn = get_db()

    # Try student_mastery first
    rows = conn.execute(
        """SELECT kp.name, AVG(sm.mastery_score) as avg_mastery, COUNT(*) as student_count,
                  SUM(CASE WHEN sm.mastery_score < 0.4 THEN 1 ELSE 0 END) as weak_count,
                  SUM(CASE WHEN sm.mastery_score > 0.7 THEN 1 ELSE 0 END) as strong_count
           FROM student_mastery sm
           JOIN knowledge_points kp ON sm.knowledge_point_id = kp.id
           JOIN submissions s ON sm.student_name = s.student_name
           JOIN assignments a ON s.assignment_id = a.id
           WHERE a.class_name = ?
           GROUP BY kp.id, kp.name
           ORDER BY avg_mastery ASC
           LIMIT 20""",
        [class_name],
    ).fetchall()

    if rows:
        conn.close()
        return [{"knowledge_point_name": r["name"], "mastery_pct": round(r["avg_mastery"], 2),
                 "total_students": r["student_count"], "weak_count": r["weak_count"], "strong_count": r["strong_count"]} for r in rows]

    # Fallback: compute from answers
    rows = conn.execute(
        """SELECT kp.name, AVG(CASE WHEN ans.is_correct = 1 THEN 1.0 ELSE 0.0 END) as avg_correct, COUNT(*) as total_answers
           FROM answers ans
           JOIN questions q ON ans.question_id = q.id
           LEFT JOIN question_knowledge_points qkp ON q.id = qkp.question_id
           LEFT JOIN knowledge_points kp ON qkp.knowledge_point_id = kp.id
           JOIN submissions s ON ans.submission_id = s.id
           JOIN assignments a ON s.assignment_id = a.id
           WHERE a.class_name = ? AND kp.name IS NOT NULL
           GROUP BY kp.id, kp.name
           ORDER BY avg_correct ASC
           LIMIT 20""",
        [class_name],
    ).fetchall()
    conn.close()
    return [{"knowledge_point_name": r["name"], "mastery_pct": round(r["avg_correct"], 2),
             "total_students": 0, "weak_count": 0, "strong_count": 0} for r in rows]


def get_trends(class_name: str, weeks: int = 8) -> list[dict]:
    """Weekly trend data."""
    conn = get_db()
    rows = conn.execute(
        """SELECT strftime('%Y-%W', s.submitted_at) as week_label,
                  COUNT(*) as submission_count,
                  COALESCE(AVG(ans.score), 0) as avg_score,
                  CAST(SUM(CASE WHEN ans.ai_confidence < 0.7 AND ans.teacher_override = 0 THEN 1 ELSE 0 END) AS REAL) / MAX(1, COUNT(*)) as low_conf_rate
           FROM submissions s
           JOIN answers ans ON ans.submission_id = s.id
           JOIN assignments a ON s.assignment_id = a.id
           WHERE a.class_name = ?
           GROUP BY week_label
           ORDER BY week_label DESC
           LIMIT ?""",
        [class_name, weeks],
    ).fetchall()
    conn.close()
    return [{"period_label": r["week_label"], "avg_score": round(r["avg_score"], 1),
             "submission_count": r["submission_count"], "low_conf_pct": round(r["low_conf_rate"], 2)} for r in rows]


def compare_classes(class_a: str, class_b: str) -> dict:
    """Side-by-side class comparison."""
    stats_a = get_class_stats()
    stats_b = get_class_stats()
    class_a_data = next((s for s in stats_a if s["class_name"] == class_a), None)
    class_b_data = next((s for s in stats_b if s["class_name"] == class_b), None)
    return {"class_a": class_a_data or {}, "class_b": class_b_data or {}}
