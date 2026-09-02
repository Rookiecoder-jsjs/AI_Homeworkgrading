import json
from collections import deque

from database import get_db
from prompts.knowledge_graph import KNOWLEDGE_EXTRACTION_PROMPT, build_extraction_prompt
from services.ai_client import chat
from utils import extract_json


async def extract_knowledge_points(question_id: int, question_content: str, subject: str, question_type: str = "short_answer") -> list[dict]:
    """LLM extracts knowledge points from a question, stores in DB, returns list."""
    conn = get_db()

    # Check cache first
    row = conn.execute("SELECT knowledge_points_json FROM questions WHERE id = ?", [question_id]).fetchone()
    if row and row["knowledge_points_json"]:
        try:
            cached = json.loads(row["knowledge_points_json"])
            if cached:
                conn.close()
                return cached
        except json.JSONDecodeError:
            pass

    user_prompt = build_extraction_prompt(question_content, subject, question_type)
    messages = [
        {"role": "system", "content": KNOWLEDGE_EXTRACTION_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    result = await chat(messages, temperature=0.2)
    data = extract_json(result)
    kps = data.get("knowledge_points", []) if data else []

    # Cache on question row
    conn.execute("UPDATE questions SET knowledge_points_json = ? WHERE id = ?", [json.dumps(kps, ensure_ascii=False), question_id])

    # Store in tables
    for kp in kps:
        name = kp.get("name", "").strip()
        if not name:
            continue
        parent_name = kp.get("parent", "").strip()
        description = kp.get("description", "")

        # Upsert knowledge point
        cur = conn.execute(
            "INSERT OR IGNORE INTO knowledge_points (name, subject, description) VALUES (?, ?, ?)",
            [name, subject, description],
        )
        if cur.lastrowid:
            kp_id = cur.lastrowid
        else:
            kp_id = conn.execute(
                "SELECT id FROM knowledge_points WHERE name = ? AND subject = ?", [name, subject]
            ).fetchone()["id"]

        # Set parent if provided
        if parent_name:
            parent_cur = conn.execute(
                "INSERT OR IGNORE INTO knowledge_points (name, subject) VALUES (?, ?)",
                [parent_name, subject],
            )
            if parent_cur.lastrowid:
                parent_id = parent_cur.lastrowid
            else:
                parent_id = conn.execute(
                    "SELECT id FROM knowledge_points WHERE name = ? AND subject = ?", [parent_name, subject]
                ).fetchone()["id"]
            conn.execute("UPDATE knowledge_points SET parent_id = ? WHERE id = ?", [parent_id, kp_id])

        # Link question to KP
        conn.execute(
            "INSERT OR IGNORE INTO question_knowledge_points (question_id, knowledge_point_id) VALUES (?, ?)",
            [question_id, kp_id],
        )

    conn.commit()
    conn.close()
    return kps


def build_dependency_graph(subject: str = "") -> tuple[dict[str, list[str]], dict[int, str]]:
    """Build adjacency list from knowledge_points parent_id relationships.

    Returns:
        (children, id_to_name) where
        - children: {parent_name: [child_name, ...]} adjacency list
        - id_to_name: {kp_id: name} lookup
    """
    conn = get_db()
    query = "SELECT id, name, parent_id FROM knowledge_points"
    params: list = []
    if subject:
        query += " WHERE subject = ?"
        params.append(subject)
    rows = conn.execute(query, params).fetchall()
    conn.close()

    children: dict[str, list[str]] = {}
    id_to_name: dict[int, str] = {}
    for r in rows:
        id_to_name[r["id"]] = r["name"]
        children[r["name"]] = []

    # Build reverse: for each node, list its children
    for r in rows:
        if r["parent_id"] and r["parent_id"] in id_to_name:
            parent_name = id_to_name[r["parent_id"]]
            if parent_name in children:
                children[parent_name].append(r["name"])

    return children, id_to_name


def compute_root_causes(wrong_question_ids: list[int]) -> list[dict]:
    """Given wrong question IDs, trace KPs upward to find common root causes.

    Performance: pulls the entire `knowledge_points` table once and does BFS
    in Python, instead of one SELECT per visited node. The table is bounded
    by the number of KPs in the curriculum (typically hundreds), not by
    submissions or answers.
    """
    conn = get_db()
    all_kps: set[int] = set()
    if wrong_question_ids:
        placeholders = ",".join("?" for _ in wrong_question_ids)
        kp_rows = conn.execute(
            f"SELECT DISTINCT knowledge_point_id FROM question_knowledge_points WHERE question_id IN ({placeholders})",
            wrong_question_ids,
        ).fetchall()
        all_kps = {r["knowledge_point_id"] for r in kp_rows}

    if not all_kps:
        conn.close()
        return []

    # Single fetch of all KP metadata — replaces the N+1 inside the BFS.
    all_kp_rows = conn.execute("SELECT id, name, parent_id FROM knowledge_points").fetchall()
    conn.close()
    kp_info: dict[int, tuple[str, int | None]] = {
        r["id"]: (r["name"], r["parent_id"]) for r in all_kp_rows
    }

    root_scores: dict[int, int] = {}  # kp_id -> affected_count
    kp_id_to_name: dict[int, str] = {}

    for kp_id in all_kps:
        visited: set[int] = set()
        queue = deque([kp_id])
        while queue:
            cur = queue.popleft()
            if cur in visited:
                continue
            visited.add(cur)
            info = kp_info.get(cur)
            if info is None:
                continue
            name, parent_id = info
            kp_id_to_name[cur] = name
            root_scores[cur] = root_scores.get(cur, 0) + 1
            if parent_id and parent_id not in visited:
                queue.append(parent_id)

    sorted_roots = sorted(root_scores.items(), key=lambda x: -x[1])
    result = []
    for kp_id, count in sorted_roots[:8]:
        result.append({
            "knowledge_point_id": kp_id,
            "name": kp_id_to_name.get(kp_id, f"KP#{kp_id}"),
            "affected_count": count,
        })
    return result


def update_student_mastery(student_name: str, knowledge_point_id: int, is_correct: bool) -> None:
    """Update mastery score using exponential moving average."""
    conn = get_db()
    row = conn.execute(
        "SELECT mastery_score, total_attempts, correct_attempts FROM student_mastery WHERE student_name = ? AND knowledge_point_id = ?",
        [student_name, knowledge_point_id],
    ).fetchone()

    if row:
        old_score = row["mastery_score"]
        new_score = 0.7 * old_score + 0.3 * (1.0 if is_correct else 0.0)
        total = row["total_attempts"] + 1
        correct = row["correct_attempts"] + (1 if is_correct else 0)
        conn.execute(
            "UPDATE student_mastery SET mastery_score=?, total_attempts=?, correct_attempts=?, last_updated=datetime('now','localtime') WHERE student_name=? AND knowledge_point_id=?",
            [new_score, total, correct, student_name, knowledge_point_id],
        )
    else:
        new_score = 1.0 if is_correct else 0.1
        conn.execute(
            "INSERT INTO student_mastery (student_name, knowledge_point_id, mastery_score, total_attempts, correct_attempts) VALUES (?, ?, ?, 1, ?)",
            [student_name, knowledge_point_id, new_score, 1 if is_correct else 0],
        )
    conn.commit()
    conn.close()


def get_student_mastery_map(student_name: str) -> dict[str, float]:
    """Returns {knowledge_point_name: mastery_score} for a student."""
    conn = get_db()
    rows = conn.execute(
        """SELECT kp.name, sm.mastery_score FROM student_mastery sm
           JOIN knowledge_points kp ON sm.knowledge_point_id = kp.id
           WHERE sm.student_name = ? ORDER BY sm.mastery_score ASC""",
        [student_name],
    ).fetchall()
    conn.close()
    return {r["name"]: r["mastery_score"] for r in rows}
