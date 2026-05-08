import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Submission } from '../../types';

export default function CorrectPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [sub, setSub] = useState<Submission | null>(null);
  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) api.getSubmission(+id).then(setSub).catch(console.error);
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    const answersList = (sub?.answers ?? [])
      .filter(a => !a.is_correct)
      .map(a => ({ question_id: a.question_id, student_answer: newAnswers[a.question_id] || '' }));
    await api.submitCorrection(+id, answersList);
    setSubmitting(false);
    nav(`/student/submissions/${id}`);
  };

  if (!sub) return <div style={{ padding: 24 }}>加载中...</div>;

  const wrongAnswers = (sub.answers ?? []).filter(a => !a.is_correct);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <button onClick={() => nav(`/student/submissions/${id}`)} style={{
        border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '0 0 12px',
      }}>
        ← 返回批改结果
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>错题订正</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>共 {wrongAnswers.length} 道错题需要订正</p>

      {wrongAnswers.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#22c55e' }}>
          <p style={{ fontSize: 48, margin: 0 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 600 }}>全部正确！</p>
        </div>
      )}

      {wrongAnswers.map((ans, i) => {
        const q = sub.questions?.find(q => q.id === ans.question_id);
        return (
          <div key={ans.id} style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b' }}>错题 {i + 1}</div>
            {q && <div style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>{q.content}</div>}
            <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
              原答案：{ans.student_answer || '(空)'}
            </div>
            {ans.ai_feedback && (
              <div style={{ fontSize: 13, color: '#92400e', marginBottom: 12, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                💡 {ans.ai_feedback}
              </div>
            )}
            <textarea
              rows={3}
              value={newAnswers[ans.question_id] || ''}
              onChange={e => setNewAnswers({ ...newAnswers, [ans.question_id]: e.target.value })}
              placeholder="输入你的订正答案..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        );
      })}

      {wrongAnswers.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? '提交中...' : '📤 提交订正'}
        </button>
      )}
    </div>
  );
}
