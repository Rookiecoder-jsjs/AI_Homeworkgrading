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


class CorrectItem(BaseModel):
    question_id: int
    student_answer: str = ""


class CorrectRequest(BaseModel):
    answers: list[CorrectItem]


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
    weak_point_details: list[dict] = []


# ── Knowledge Graph ───────────────────────────────────────

class KnowledgePointOut(BaseModel):
    id: int
    name: str
    subject: str = ""
    parent_id: Optional[int] = None
    description: str = ""


class KnowledgeGraphNode(BaseModel):
    id: int
    name: str
    children: list["KnowledgeGraphNode"] = []
    mastery_score: Optional[float] = None


class WeakPointDiagnosis(BaseModel):
    knowledge_point_id: int
    knowledge_point_name: str
    root_cause_name: str = ""
    mastery_score: float = 0.0
    affected_count: int = 0


# ── Teacher Style ─────────────────────────────────────────

class TeacherStyleProfile(BaseModel):
    teacher_name: str
    question_type: str
    avg_bias: float
    bias_stddev: float
    total_overrides: int
    strictness_level: str
    last_updated: str = ""


class TeacherStyleReport(BaseModel):
    teacher_name: str
    profiles: list[dict] = []
    total_overrides: int = 0
    overall_bias: float = 0.0
    classification: str = "balanced"
    recommendation: str = ""
