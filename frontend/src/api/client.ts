const BASE = '';

export function assetUrl(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Assignments
  createAssignment(data: object) {
    return request<any>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listAssignments(status = '') {
    const qs = status ? `?status=${status}` : '';
    return request<any[]>(`/api/assignments${qs}`);
  },
  getAssignment(id: number) {
    return request<any>(`/api/assignments/${id}`);
  },
  updateAssignment(id: number, data: object) {
    return request<any>(`/api/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteAssignment(id: number) {
    return request<any>(`/api/assignments/${id}`, { method: 'DELETE' });
  },
  exportGradesUrl(id: number) {
    return `${BASE}/api/assignments/${id}/export`;
  },

  // Submissions
  async submitAssignment(form: FormData) {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  listSubmissions(assignmentId?: number) {
    const qs = assignmentId ? `?assignment_id=${assignmentId}` : '';
    return request<any[]>(`/api/submissions${qs}`);
  },
  getSubmission(id: number) {
    return request<any>(`/api/submissions/${id}`);
  },

  // Grading
  triggerGrading(submissionId: number) {
    return request<any>(`/api/submissions/${submissionId}/grade`, { method: 'POST' });
  },
  triggerBatchGrading(assignmentId: number) {
    return request<any>(`/api/assignments/${assignmentId}/grade-all`, { method: 'POST' });
  },
  overrideAnswer(answerId: number, data: object) {
    return request<any>(`/api/answers/${answerId}/override`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  submitCorrection(submissionId: number, answers: object[]) {
    return request<any>(`/api/submissions/${submissionId}/correct`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  // OCR
  async ocrQuestionImage(file: File) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/ocr/question`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ image_url: string; questions: Array<{ content: string; type: string; reference_answer: string; points: number }> }>;
  },

  // Dashboard
  getTeacherDashboard() {
    return request<any>('/api/dashboard/teacher');
  },
  getStudentDashboard(name: string) {
    return request<any>(`/api/dashboard/student?name=${encodeURIComponent(name)}`);
  },
  getReviewQueue() {
    return request<any[]>('/api/dashboard/review-queue');
  },

  // Knowledge Graph
  getKnowledgeGraph(subject: string) {
    return request<any>(`/api/dashboard/knowledge-graph/${encodeURIComponent(subject)}`);
  },
  getStudentDiagnosis(name: string) {
    return request<any>(`/api/dashboard/student/${encodeURIComponent(name)}/diagnosis`);
  },

  // Teacher Style
  getTeacherStyle(teacherName: string) {
    return request<any>(`/api/dashboard/teacher-style/${encodeURIComponent(teacherName)}`);
  },

  // OCR for teacher-provided reference answer image
  async ocrReferenceAnswer(file: File) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/ocr/reference-answer`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ image_url: string; reference_answer: string }>;
  },

  // Error Book
  getErrorBook(studentName: string, subject = '') {
    const params = new URLSearchParams({ student_name: studentName });
    if (subject) params.set('subject', subject);
    return request<any[]>(`/api/error-book?${params}`);
  },
  async syncErrorBook(studentName: string) {
    const res = await fetch(`${BASE}/api/error-book/sync?student_name=${encodeURIComponent(studentName)}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async generateSimilarQuestion(entryId: number) {
    const res = await fetch(`${BASE}/api/error-book/${entryId}/similar-question`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Class Analytics
  getClassOverview(teacherName = '') {
    const qs = teacherName ? `?teacher_name=${encodeURIComponent(teacherName)}` : '';
    return request<any[]>(`/api/dashboard/class-overview${qs}`);
  },
  getKnowledgeHeatmap(className: string) {
    return request<any[]>(`/api/dashboard/knowledge-heatmap?class_name=${encodeURIComponent(className)}`);
  },
  getTrends(className: string, weeks = 8) {
    return request<any[]>(`/api/dashboard/trends?class_name=${encodeURIComponent(className)}&weeks=${weeks}`);
  },

  // PDF Reports
  downloadReportUrl(studentName: string, className = '', teacherName = '') {
    const p = new URLSearchParams();
    if (className) p.set('class_name', className);
    if (teacherName) p.set('teacher_name', teacherName);
    return `${BASE}/api/reports/student/${encodeURIComponent(studentName)}?${p}`;
  },
};
