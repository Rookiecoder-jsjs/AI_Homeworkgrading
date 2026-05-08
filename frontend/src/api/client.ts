const BASE = 'http://localhost:8000';

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
  deleteAssignment(id: number) {
    return request<any>(`/api/assignments/${id}`, { method: 'DELETE' });
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
};
