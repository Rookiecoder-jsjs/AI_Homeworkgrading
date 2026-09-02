export interface Question {
  id: number;
  assignment_id: number;
  type: 'choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'essay';
  content: string;
  reference_answer: string;
  rubric: string;
  points: number;
  sort_order: number;
  image_url: string;
}

export interface Assignment {
  id: number;
  title: string;
  subject: string;
  description: string;
  teacher_name: string;
  class_name: string;
  due_date: string;
  status: string;
  created_at: string;
  questions?: Question[];
}

export type QuestionPayload = Omit<Question, 'id' | 'assignment_id'>;

export interface AssignmentPayload {
  title: string;
  subject: string;
  description: string;
  teacher_name: string;
  class_name: string;
  due_date: string;
  status: 'draft' | 'published' | 'closed';
  questions: QuestionPayload[];
}

export interface Answer {
  id: number;
  submission_id: number;
  question_id: number;
  student_answer: string;
  is_correct: boolean | null;
  ai_confidence: number | null;
  ai_feedback: string;
  score: number;
  teacher_override: number;
  teacher_comment: string;
  image_url: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_name: string;
  status: string;
  image_url: string;
  submitted_at: string;
  answers?: Answer[];
  questions?: Question[];
}

export interface SubmissionSummary extends Submission {
  low_conf_count: number;
  high_conf_count: number;
  reviewed_count: number;
  total_answers: number;
}

export interface BatchGradingResult {
  ok: boolean;
  total: number;
  graded: number;
  message: string;
  errors: { id: number; error: string }[];
}

export interface AnswerOverridePayload {
  is_correct?: boolean | null;
  score?: number | null;
  teacher_comment?: string | null;
}

export interface CorrectionAnswer {
  question_id: number;
  student_answer: string;
}

export interface OCRQuestion {
  content: string;
  type: Question['type'];
  reference_answer: string;
  points: number;
}

export interface OCRQuestionResponse {
  image_url: string;
  questions: OCRQuestion[];
}

export interface ErrorBookEntry {
  id: number;
  student_name: string;
  question_id: number;
  question_content?: string;
  question_type?: string;
  reference_answer?: string;
  wrong_answer: string;
  subject: string;
  added_at: string;
  reviewed_count: number;
  status: string;
}

export interface SimilarQuestion {
  question_content: string;
  reference_answer: string;
  hint: string;
  knowledge_points: string[];
}

export interface SimilarQuestionResponse {
  ok: boolean;
  similar_question: SimilarQuestion;
}

export interface ErrorBookSyncResult {
  ok: boolean;
  added: number;
}

export interface ReviewQueueItem {
  id: number;
  assignment_id: number;
  student_name: string;
  status: string;
  submitted_at: string;
  assignment_title: string;
  low_conf_count: number;
}

export interface ClassOverview {
  class_name: string;
  student_count: number;
  unique_students: number;
  avg_score: number;
  completion_rate: number;
}

export interface HeatmapItem {
  knowledge_point_name: string;
  mastery_pct: number;
  total_students: number;
  weak_count: number;
  strong_count: number;
}

export interface TrendPoint {
  period_label: string;
  avg_score: number;
  submission_count: number;
  low_conf_pct: number;
}

export interface TeacherDashboard {
  total_assignments: number;
  total_submissions: number;
  graded_count: number;
  pending_review_count: number;
  average_score: number;
}

export interface StudentDashboard {
  total_assignments: number;
  completed_count: number;
  average_score: number;
  weak_points: string[];
  weak_point_details: { knowledge_point_name: string; mastery_score: number }[];
}

export interface TeacherStyleReport {
  teacher_name: string;
  profiles: { question_type: string; avg_bias: number; total_overrides: number; strictness_level: string }[];
  total_overrides: number;
  overall_bias: number;
  classification: string;
  recommendation: string;
}

export interface KnowledgeGraphRoot {
  id: number;
  name: string;
  parent_id: number | null;
  description: string;
  children: KnowledgeGraphRoot[];
}

export interface StudentDiagnosis {
  student_name: string;
  wrong_question_count: number;
  root_causes: { knowledge_point_id: number; name: string; affected_count: number }[];
  mastery: Record<string, number>;
}

export interface KnowledgeGraphResponse {
  subject: string;
  roots: KnowledgeGraphRoot[];
}
