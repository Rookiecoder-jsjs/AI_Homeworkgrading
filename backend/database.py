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


CREATE TABLE IF NOT EXISTS knowledge_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT DEFAULT '',
    parent_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(name, subject)
);

CREATE TABLE IF NOT EXISTS question_knowledge_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    importance REAL DEFAULT 0.5,
    UNIQUE(question_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS student_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    mastery_score REAL DEFAULT 0.0,
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(student_name, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS teacher_style_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_name TEXT NOT NULL,
    question_type TEXT DEFAULT '',
    avg_bias REAL DEFAULT 0.0,
    bias_stddev REAL DEFAULT 0.0,
    total_overrides INTEGER DEFAULT 0,
    strictness_level TEXT DEFAULT 'normal',
    last_updated TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(teacher_name, question_type)
);

CREATE INDEX IF NOT EXISTS idx_questions_assignment ON questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_kp_parent ON knowledge_points(parent_id);
CREATE INDEX IF NOT EXISTS idx_kp_subject ON knowledge_points(subject);
CREATE INDEX IF NOT EXISTS idx_qkp_question ON question_knowledge_points(question_id);
CREATE TABLE IF NOT EXISTS error_book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_id INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    wrong_answer TEXT DEFAULT '',
    knowledge_points_json TEXT DEFAULT '[]',
    subject TEXT DEFAULT '',
    class_name TEXT DEFAULT '',
    added_at TEXT DEFAULT (datetime('now','localtime')),
    reviewed_count INTEGER DEFAULT 0,
    last_reviewed TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    UNIQUE(student_name, answer_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_student ON student_mastery(student_name);
CREATE INDEX IF NOT EXISTS idx_eb_student ON error_book(student_name);
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_session(commit: bool = True):
    """Context manager that yields a SQLite connection and ensures cleanup.

    Usage::

        with db_session() as conn:
            conn.execute(...)
        # on exit: commit (if commit=True) then close. Rollback on exception.

    For read-only paths, pass ``commit=False`` to skip the commit overhead.
    """
    conn = get_db()
    try:
        yield conn
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def db_session(commit: bool = True):
    """Context manager that yields a SQLite connection and ensures cleanup.

    Usage:
        with db_session() as conn:
            conn.execute(...)
    # on exit: commit (if commit=True) then close. Rollback on exception.
    """
    conn = get_db()
    try:
        yield conn
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    conn = get_db()
    conn.executescript(SCHEMA)
    _migrate(conn)
    conn.commit()
    conn.close()


def _migrate(conn) -> None:
    """Apply missing-column migrations safely by checking schema first."""
    migrations = {
        "answers": [
            ("image_url", "TEXT DEFAULT ''"),
            ("ai_score", "INTEGER DEFAULT 0"),
        ],
        "questions": [
            ("image_url", "TEXT DEFAULT ''"),
            ("knowledge_points_json", "TEXT DEFAULT ''"),
        ],
    }
    for table, columns in migrations.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
        for col_name, col_def in columns:
            if col_name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
