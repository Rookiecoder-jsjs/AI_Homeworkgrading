import sqlite3
from config import DATABASE_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT DEFAULT '',
    description TEXT DEFAULT '',
    teacher_name TEXT DEFAULT '',
    class_name TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('choice','true_false','fill_blank','short_answer','essay')),
    content TEXT NOT NULL,
    reference_answer TEXT DEFAULT '',
    rubric TEXT DEFAULT '',
    points INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    image_url TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    status TEXT DEFAULT 'submitted',
    image_url TEXT DEFAULT '',
    submitted_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_answer TEXT DEFAULT '',
    is_correct INTEGER DEFAULT NULL,
    ai_confidence REAL DEFAULT NULL,
    ai_feedback TEXT DEFAULT '',
    score INTEGER DEFAULT 0,
    teacher_override INTEGER DEFAULT 0,
    teacher_comment TEXT DEFAULT '',
    image_url TEXT DEFAULT ''
);


CREATE INDEX IF NOT EXISTS idx_questions_assignment ON questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript(SCHEMA)
    # Migrations for older schema upgrades
    for sql in [
        "ALTER TABLE answers ADD COLUMN image_url TEXT DEFAULT ''",
        "ALTER TABLE questions ADD COLUMN image_url TEXT DEFAULT ''",
    ]:
        try:
            conn.execute(sql)
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()
