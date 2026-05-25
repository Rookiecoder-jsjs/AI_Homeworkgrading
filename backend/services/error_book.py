from database import get_db


def add_to_error_book(student_name: str, answer_id: int) -> dict | None:
    """Copy a wrong answer into the error book. Dedup by answer_id."""
    conn = get_db()

    # Get the answer + related question info
    row = conn.execute(
        """SELECT a.*, q.content as question_content, q.type as question_type,
                  q.reference_answer, q.knowledge_points_json,
                  a_sub.subject, a_sub.class_name
           FROM answers a
           JOIN questions q ON a.question_id = q.id
           JOIN submissions s ON a.submission_id = s.id
           JOIN assignments a_sub ON s.assignment_id = a_sub.id
           WHERE a.id = ?""",
        [answer_id],
    ).fetchone()

    if not row:
        conn.close()
        return None

    try:
        conn.execute(
            """INSERT INTO error_book (student_name, question_id, answer_id, wrong_answer,
               knowledge_points_json, subject, class_name)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [student_name, row["question_id"], answer_id, row["student_answer"],
             row["knowledge_points_json"] or "[]", row["subject"] or "", row["class_name"] or ""],
        )
        conn.commit()
    except Exception:  # UNIQUE violation or other
        pass

    entry = conn.execute("SELECT * FROM error_book WHERE answer_id = ?", [answer_id]).fetchone()
    result = dict(entry) if entry else None
    conn.close()
    return result


def get_error_book(student_name: str, subject_filter: str = "", kp_filter: str = "", limit: int = 50, offset: int = 0) -> list[dict]:
    """List error book entries with optional filters."""
    conn = get_db()
    query = "SELECT * FROM error_book WHERE student_name = ?"
    params: list = [student_name]
    if subject_filter:
        query += " AND subject = ?"
        params.append(subject_filter)
    if kp_filter:
        query += " AND knowledge_points_json LIKE ?"
        params.append(f"%{kp_filter}%")
    query += " ORDER BY added_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_error_book_stats(student_name: str) -> dict:
    """Stats: total errors, by subject, by knowledge point."""
    conn = get_db()
    rows = conn.execute(
        "SELECT subject, COUNT(*) as cnt FROM error_book WHERE student_name = ? AND status = 'active' GROUP BY subject",
        [student_name],
    ).fetchall()
    by_subject = {r["subject"] or "未分类": r["cnt"] for r in rows}
    total = sum(by_subject.values())
    conn.close()
    return {"total_errors": total, "by_subject": by_subject}


def mark_as_reviewed(entry_id: int) -> None:
    """Mark an error book entry as reviewed."""
    conn = get_db()
    conn.execute(
        "UPDATE error_book SET reviewed_count = reviewed_count + 1, last_reviewed = datetime('now','localtime') WHERE id = ?",
        [entry_id],
    )
    conn.commit()
    conn.close()


def auto_add_wrong_answers(student_name: str) -> int:
    """Scan all submissions for this student and add wrong answers to error book."""
    conn = get_db()
    wrong = conn.execute(
        """SELECT a.id FROM answers a
           JOIN submissions s ON a.submission_id = s.id
           WHERE s.student_name = ? AND a.is_correct = 0
           AND a.id NOT IN (SELECT answer_id FROM error_book WHERE student_name = ?)""",
        [student_name, student_name],
    ).fetchall()
    conn.close()

    added = 0
    for row in wrong:
        if add_to_error_book(student_name, row["id"]):
            added += 1
    return added
