from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

QuestionType = Literal["choice", "true_false", "fill_blank", "short_answer", "essay"]


# ── Question ──────────────────────────────────────────────

class QuestionCreate(BaseModel):
    type: QuestionType
    content: str = Field(min_length=1, max_length=20_000)
    reference_answer: str = Field(default="", max_length=20_000)
    rubric: str = Field(default="", max_length=20_000)
    points: int = Field(default=1, ge=0, le=1_000)
    sort_order: int = Field(default=0, ge=0)
    image_url: str = Field(default="", max_length=500)


class QuestionOut(QuestionCreate):
    id: int
    assignment_id: int


# ── Assignment ────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subject: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=20_000)
    teacher_name: str = Field(default="", max_length=100)
    class_name: str = Field(default="", max_length=100)
    due_date: str = Field(default="", max_length=50)
    status: Literal["draft", "published", "closed"] = "draft"
    questions: list[QuestionCreate] = Field(default_factory=list)


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
    is_correct: bool | None = None
    ai_confidence: float | None = None
    ai_feedback: str = ""
    score: int = 0
    teacher_override: int = 0
    teacher_comment: str = ""
    image_url: str = ""


class SubmissionDetail(SubmissionOut):
    answers: list[AnswerOut] = []
    questions: list[QuestionOut] = []


class AnswerUpdate(BaseModel):
    is_correct: bool | None = None
    score: int | None = Field(default=None, ge=0, le=1_000)
    teacher_comment: str | None = Field(default=None, max_length=5_000)
    teacher_override: int = 1


class CorrectItem(BaseModel):
    question_id: int = Field(gt=0)
    student_answer: str = Field(default="", max_length=20_000)


class CorrectRequest(BaseModel):
    answers: list[CorrectItem] = Field(min_length=1)


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
    parent_id: int | None = None
    description: str = ""


class KnowledgeGraphNode(BaseModel):
    id: int
    name: str
    children: list[KnowledgeGraphNode] = []
    mastery_score: float | None = None


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
