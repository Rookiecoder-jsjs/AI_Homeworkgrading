import math

from database import get_db


def update_teacher_style(teacher_name: str, question_type: str, ai_score: int, teacher_score: int) -> None:
    """Record an override and update running bias statistics."""
    conn = get_db()
    bias = teacher_score - ai_score

    row = conn.execute(
        "SELECT avg_bias, bias_stddev, total_overrides FROM teacher_style_profile WHERE teacher_name = ? AND question_type = ?",
        [teacher_name, question_type],
    ).fetchone()

    if row:
        n = row["total_overrides"] + 1
        # Welford's online algorithm for running mean + variance
        old_avg = row["avg_bias"]
        new_avg = old_avg + (bias - old_avg) / n
        old_std = row["bias_stddev"] or 0.0
        new_std = ((n - 1) * old_std ** 2 + (bias - old_avg) * (bias - new_avg)) / n
        new_std = math.sqrt(max(new_std, 0))
        level = _classify_strictness(new_avg)
        conn.execute(
            "UPDATE teacher_style_profile SET avg_bias=?, bias_stddev=?, total_overrides=?, strictness_level=?, last_updated=datetime('now','localtime') WHERE teacher_name=? AND question_type=?",
            [new_avg, new_std, n, level, teacher_name, question_type],
        )
    else:
        level = _classify_strictness(bias)
        conn.execute(
            "INSERT INTO teacher_style_profile (teacher_name, question_type, avg_bias, bias_stddev, total_overrides, strictness_level) VALUES (?, ?, ?, 0, 1, ?)",
            [teacher_name, question_type, float(bias), level],
        )
    conn.commit()
    conn.close()


def get_teacher_bias(teacher_name: str, question_type: str = "") -> float:
    """Get the average bias for a teacher, optionally filtered by question type."""
    conn = get_db()
    if question_type:
        row = conn.execute(
            "SELECT avg_bias FROM teacher_style_profile WHERE teacher_name = ? AND question_type = ?",
            [teacher_name, question_type],
        ).fetchone()
        conn.close()
        return row["avg_bias"] if row else 0.0
    # Overall average across all types
    row = conn.execute(
        "SELECT AVG(avg_bias) as overall FROM teacher_style_profile WHERE teacher_name = ?",
        [teacher_name],
    ).fetchone()
    conn.close()
    return row["overall"] if row and row["overall"] else 0.0


def get_teacher_style_report(teacher_name: str) -> dict:
    """Get full style profile for a teacher."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM teacher_style_profile WHERE teacher_name = ? ORDER BY total_overrides DESC",
        [teacher_name],
    ).fetchall()
    conn.close()

    profiles = [dict(r) for r in rows]
    total = sum(r["total_overrides"] for r in rows)
    overall_bias = sum(r["avg_bias"] * r["total_overrides"] for r in rows) / max(total, 1)

    if abs(overall_bias) < 0.5:
        classification = "balanced"
        rec = "您的评分标准与 AI 基本一致，AI 辅助批改可直接使用。"
    elif overall_bias > 0:
        classification = "lenient"
        rec = f"您平均比 AI 宽松 {overall_bias:.1f} 分。已自动调高 AI 建议分数。"
    else:
        classification = "strict"
        rec = f"您平均比 AI 严格 {abs(overall_bias):.1f} 分。已自动调低 AI 建议分数。"

    return {
        "teacher_name": teacher_name,
        "profiles": profiles,
        "total_overrides": total,
        "overall_bias": round(overall_bias, 2),
        "classification": classification,
        "recommendation": rec,
    }


def apply_correction(ai_score: int, bias: float, max_points: int) -> int:
    """Apply teacher style bias to AI score, capped at valid range."""
    return max(0, min(max_points, round(ai_score + bias)))


def _classify_strictness(avg_bias: float) -> str:
    if avg_bias > 1.0:
        return "lenient"
    elif avg_bias < -1.0:
        return "strict"
    return "normal"
