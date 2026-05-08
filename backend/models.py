from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ── Question ──────────────────────────────────────────────

class QuestionCreate(BaseModel):
    type: str  # choice / true_false / fill_blank / short_answer / essay
    content: str
    reference_answer: str = ""
    rubric: str = ""
    points: int = 1
    sort_order: int = 0
    image_url: str = ""


class QuestionOut(QuestionCreate):
    id: int
    assignment_id: int


# ── Assignment ────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    title: str
    subject: str = ""
    description: str = ""
    teacher_name: str = ""
    class_name: str = ""
    due_date: str = ""
    status: str = "draft"
    questions: list[QuestionCreate] = []


class AssignmentOut(BaseModel):
    id: int
    title: str
    subject: str
    description: str
    teacher_name: str
    class_name: str
    due_date: str
    status: str
    created_at: str


class AssignmentDetail(AssignmentOut):
    questions: list[QuestionOut] = []


# ── Submission ────────────────────────────────────────────

class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_name: str
    status: str
    image_url: str
    submitted_at: str


class AnswerOut(BaseModel):
    id: int
    submission_id: int
    question_id: int
    student_answer: str
    is_correct: Optional[bool] = None
    ai_confidence: Optional[float] = None
    ai_feedback: str = ""
    score: int = 0
    teacher_override: int = 0
    teacher_comment: str = ""
    image_url: str = ""


class SubmissionDetail(SubmissionOut):
    answers: list[AnswerOut] = []
    questions: list[QuestionOut] = []


class AnswerUpdate(BaseModel):
    is_correct: Optional[bool] = None
    score: Optional[int] = None
    teacher_comment: Optional[str] = None
    teacher_override: int = 1


class CorrectRequest(BaseModel):
    answers: list  # [{"question_id": 1, "student_answer": "..."}, ...]


# ── Dashboard ─────────────────────────────────────────────

class TeacherDashboard(BaseModel):
    total_assignments: int
    total_submissions: int
    graded_count: int
    pending_review_count: int
    average_score: float


class StudentDashboard(BaseModel):
    total_assignments: int
    completed_count: int
    average_score: float
    weak_points: list[str] = []
