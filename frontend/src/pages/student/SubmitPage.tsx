import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment } from '../../types';

export default function SubmitPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const name = localStorage.getItem('student_name') || '';
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [images, setImages] = useState<Record<number, { file: File; preview: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (id) api.getAssignment(+id).then(setAssignment).catch(console.error); }, [id]);

  const handleImagePick = (questionId: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setImages((prev) => ({ ...prev, [questionId]: { file, preview: URL.createObjectURL(file) } }));
    };
    input.click();
  };

  const removeImage = (qid: number) => {
    setImages((prev) => {
      const next = { ...prev };
      if (next[qid]) URL.revokeObjectURL(next[qid].preview);
      delete next[qid];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('assignment_id', id);
      form.append('student_name', name);
      for (const [qid, img] of Object.entries(images)) {
        form.append('question_images', img.file);
        form.append('question_image_ids', qid);
      }
      const answerList = (assignment?.questions ?? []).map((q) => ({
        question_id: q.id,
        student_answer: answers[q.id] || '',
        has_image: String(!!images[q.id]),
      }));
      form.append('answers_json', JSON.stringify(answerList));
      const result = await api.submitAssignment(form);
      nav(`/student/submissions/${result.id}`);
    } catch (e: any) { alert('提交失败：' + e.message); }
    setSubmitting(false);
  };

  if (!assignment) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>加载中...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      <button onClick={() => nav('/student/assignments')} style={{
        border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '0 0 12px',
      }}>
        ← 返回作业列表
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', color: '#0f172a' }}>{assignment.title}</h1>
      <p style={{ color: '#64748b', margin: '0 0 28px', fontSize: 14 }}>
        {assignment.subject} &middot; {assignment.teacher_name}
      </p>

      {(assignment.questions ?? []).map((q, i) => {
        const img = images[q.id];
        return (
          <div key={q.id} style={{
            marginBottom: 18, padding: 20, borderRadius: 14,
            background: '#fff', border: '1px solid #e2e8f0',
            transition: 'box-shadow 0.2s',
            animation: `fadeInUp 0.35s ${i * 0.05}s cubic-bezier(0.4,0,0.2,1) both`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 7, background: '#eef2ff',
                color: '#4338ca', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', background: '#eef2ff', padding: '2px 10px', borderRadius: 6 }}>
                {typeLabel[q.type]}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>&middot; {q.points} 分</span>
            </div>

            {q.image_url && (
              <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={`http://localhost:8000${q.image_url}`} alt="题目图片" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', background: '#fafbfc' }} />
              </div>
            )}
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, marginBottom: 14 }}>
              {q.content}
            </div>

            <div style={{ position: 'relative' }}>
              <textarea
                rows={q.type === 'essay' ? 6 : 3}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="在此输入你的答案..."
                style={{
                  width: '100%', padding: '12px 46px 12px 14px', borderRadius: 10,
                  border: '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.6,
                  boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
              />
              <button type="button" onClick={() => handleImagePick(q.id)} title="拍照上传此题" style={{
                position: 'absolute', right: 10, bottom: 10,
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${img ? '#c7d2fe' : '#e2e8f0'}`,
                background: img ? '#eef2ff' : '#fff',
                cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>📷</button>
            </div>

            {img && (
              <div style={{ marginTop: 10, display: 'inline-flex', position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={img.preview} alt="题目照片" style={{ width: 120, height: 80, objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => removeImage(q.id)} style={{
                  position: 'absolute', top: 3, right: 3, width: 18, height: 18,
                  borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)',
                  color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>✕</button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={handleSubmit} disabled={submitting} style={{
        width: '100%', padding: 15, borderRadius: 14, border: 'none',
        background: submitting ? '#a5b4fc' : '#4338ca', color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
        boxShadow: submitting ? undefined : '0 4px 16px rgba(67,56,202,0.25)',
        transition: 'all 0.2s', marginTop: 8,
      }}>
        {submitting ? '提交中...' : '提交作业'}
      </button>
    </div>
  );
}

const typeLabel: Record<string, string> = {
  choice: '选择题', true_false: '判断题', fill_blank: '填空题',
  short_answer: '简答题', essay: '作文/证明题',
};
