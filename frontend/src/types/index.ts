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
