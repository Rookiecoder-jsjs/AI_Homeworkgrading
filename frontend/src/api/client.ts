import type {
  AnswerOverridePayload,
  Assignment,
  AssignmentPayload,
  BatchGradingResult,
  ClassOverview,
  CorrectionAnswer,
  ErrorBookEntry,
  ErrorBookSyncResult,
  HeatmapItem,
  KnowledgeGraphResponse,
  ReviewQueueItem,
  SimilarQuestionResponse,
  StudentDashboard,
  StudentDiagnosis,
  Submission,
  SubmissionSummary,
  TeacherDashboard,
  TeacherStyleReport,
  TrendPoint,
  OCRQuestionResponse,
} from '../types';

const BASE = '';

async function readError(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const payload = JSON.parse(body);
    if (typeof payload.detail === 'string') return payload.detail;
  } catch {
    // Keep the original response text when it is not JSON.
  }
  return body;
}

export function assetUrl(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await readError(res);
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Assignments
  createAssignment(data: AssignmentPayload) {
    return request<Assignment>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listAssignments(status = '') {
    const qs = status ? `?status=${status}` : '';
    return request<Assignment[]>(`/api/assignments${qs}`);
  },
  getAssignment(id: number) {
    return request<Assignment>(`/api/assignments/${id}`);
  },
  updateAssignment(id: number, data: AssignmentPayload) {
    return request<Assignment>(`/api/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteAssignment(id: number) {
    return request<{ ok: boolean }>(`/api/assignments/${id}`, { method: 'DELETE' });
  },
  exportGradesUrl(id: number) {
    return `${BASE}/api/assignments/${id}/export`;
  },

  // Submissions
  async submitAssignment(form: FormData): Promise<Submission> {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error((await readError(res)) || `HTTP ${res.status}`);
    return res.json() as Promise<Submission>;
  },
  listSubmissions(assignmentId?: number, studentName = '') {
    const params = new URLSearchParams();
    if (assignmentId) params.set('assignment_id', String(assignmentId));
    if (studentName.trim()) params.set('student_name', studentName.trim());
    const qs = params.toString() ? `?${params}` : '';
    return request<SubmissionSummary[]>(`/api/submissions${qs}`);
  },
  getSubmission(id: number) {
    return request<Submission>(`/api/submissions/${id}`);
  },

  // Grading
  triggerGrading(submissionId: number) {
    return request<{ ok: boolean; message: string }>(`/api/submissions/${submissionId}/grade`, { method: 'POST' });
  },
  triggerBatchGrading(assignmentId: number) {
    return request<BatchGradingResult>(`/api/assignments/${assignmentId}/grade-all`, { method: 'POST' });
  },
  overrideAnswer(answerId: number, data: AnswerOverridePayload) {
    return request<{ ok: boolean }>(`/api/answers/${answerId}/override`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  submitCorrection(submissionId: number, answers: CorrectionAnswer[]) {
    return request<{ ok: boolean; message: string }>(`/api/submissions/${submissionId}/correct`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  // OCR
  async ocrQuestionImage(file: File) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/ocr/question`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await readError(res)) || `HTTP ${res.status}`);
    return res.json() as Promise<OCRQuestionResponse>;
  },

  // Dashboard
  getTeacherDashboard() {
    return request<TeacherDashboard>('/api/dashboard/teacher');
  },
  getStudentDashboard(name: string) {
    return request<StudentDashboard>(`/api/dashboard/student?name=${encodeURIComponent(name)}`);
  },
  getReviewQueue() {
    return request<ReviewQueueItem[]>('/api/dashboard/review-queue');
  },

  // Knowledge Graph
  getKnowledgeGraph(subject: string) {
    return request<KnowledgeGraphResponse>(`/api/dashboard/knowledge-graph/${encodeURIComponent(subject)}`);
  },
  getStudentDiagnosis(name: string) {
    return request<StudentDiagnosis>(`/api/dashboard/student/${encodeURIComponent(name)}/diagnosis`);
  },

  // Teacher Style
  getTeacherStyle(teacherName: string) {
    return request<TeacherStyleReport>(`/api/dashboard/teacher-style/${encodeURIComponent(teacherName)}`);
  },

  // OCR for teacher-provided reference answer image
  async ocrReferenceAnswer(file: File) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/ocr/reference-answer`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await readError(res)) || `HTTP ${res.status}`);
    return res.json() as Promise<{ image_url: string; reference_answer: string }>;
  },

  // Error Book
  getErrorBook(studentName: string, subject = '') {
    const params = new URLSearchParams({ student_name: studentName });
    if (subject) params.set('subject', subject);
    return request<ErrorBookEntry[]>(`/api/error-book?${params}`);
  },
  async syncErrorBook(studentName: string): Promise<ErrorBookSyncResult> {
    const res = await fetch(`${BASE}/api/error-book/sync?student_name=${encodeURIComponent(studentName)}`, { method: 'POST' });
    if (!res.ok) throw new Error((await readError(res)) || `HTTP ${res.status}`);
    return res.json() as Promise<ErrorBookSyncResult>;
  },
  async generateSimilarQuestion(entryId: number): Promise<SimilarQuestionResponse> {
    const res = await fetch(`${BASE}/api/error-book/${entryId}/similar-question`, { method: 'POST' });
    if (!res.ok) throw new Error((await readError(res)) || `HTTP ${res.status}`);
    return res.json() as Promise<SimilarQuestionResponse>;
  },

  // Class Analytics
  getClassOverview(teacherName = '') {
    const qs = teacherName ? `?teacher_name=${encodeURIComponent(teacherName)}` : '';
    return request<ClassOverview[]>(`/api/dashboard/class-overview${qs}`);
  },
  getKnowledgeHeatmap(className: string) {
    return request<HeatmapItem[]>(`/api/dashboard/knowledge-heatmap?class_name=${encodeURIComponent(className)}`);
  },
  getTrends(className: string, weeks = 8) {
    return request<TrendPoint[]>(`/api/dashboard/trends?class_name=${encodeURIComponent(className)}&weeks=${weeks}`);
  },

  // PDF Reports
  downloadReportUrl(studentName: string, className = '', teacherName = '') {
    const p = new URLSearchParams();
    if (className) p.set('class_name', className);
    if (teacherName) p.set('teacher_name', teacherName);
    return `${BASE}/api/reports/student/${encodeURIComponent(studentName)}?${p}`;
  },
};
