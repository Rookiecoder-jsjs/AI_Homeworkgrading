import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SimilarQuestionCard from '../../components/SimilarQuestionCard';
import CleanContent from '../../components/CleanContent';

interface ErrorEntry {
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

export default function ErrorBookPage() {
  const nav = useNavigate();
  const name = localStorage.getItem('student_name') || '';
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [genLoading, setGenLoading] = useState<Record<number, boolean>>({});
  const [similarQuestions, setSimilarQuestions] = useState<Record<number, any>>({});

  const load = () => {
    api.getErrorBook(name, subjectFilter)
      .then(setEntries)
      .catch(console.error);
  };

  useEffect(() => { if (name) load(); }, [name, subjectFilter]);

  const handleSync = async () => {
    await api.syncErrorBook(name);
    load();
  };

  const handleGenerate = async (entryId: number) => {
    setGenLoading((p) => ({ ...p, [entryId]: true }));
    try {
      const result = await api.generateSimilarQuestion(entryId);
      if (result.ok) {
        setSimilarQuestions((p) => ({ ...p, [entryId]: result.similar_question }));
      }
    } catch (e: any) { alert('生成失败：' + e.message); }
    setGenLoading((p) => ({ ...p, [entryId]: false }));
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => nav('/student/dashboard')} style={{
          border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
        }}>← 返回看板</button>
        <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>📖 错题本</h1>
        <div style={{ flex: 1 }} />
        <button onClick={handleSync} style={{
          padding: '6px 16px', borderRadius: 8, border: '1px solid #c7d2fe',
          background: '#eef2ff', color: '#4338ca', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}>🔄 同步错题</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={{
          padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13,
          outline: 'none', fontFamily: 'inherit', color: '#475569',
        }}>
          <option value="">全部科目</option>
          <option value="数学">数学</option>
          <option value="语文">语文</option>
          <option value="英语">英语</option>
          <option value="物理">物理</option>
          <option value="化学">化学</option>
          <option value="生物">生物</option>
        </select>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#94a3b8' }}>{entries.length} 道错题</span>
      </div>

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>错题本为空</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>提交作业并完成批改后，错题会自动收录</div>
        </div>
      )}

      {entries.map((entry, i) => (
        <div key={entry.id} style={{
          marginBottom: 16, padding: 18, borderRadius: 14, background: '#fff',
          border: '1px solid #e2e8f0',
          animation: `fadeInUp 0.3s ${i * 0.04}s cubic-bezier(0.4,0,0.2,1) both`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{entry.added_at?.slice(0, 10)}</span>
            {entry.subject && (
              <span style={{ padding: '1px 8px', borderRadius: 6, fontSize: 11, background: '#f1f5f9', color: '#64748b' }}>
                {entry.subject}
              </span>
            )}
            {entry.question_type && (
              <span style={{ padding: '1px 8px', borderRadius: 6, fontSize: 11, background: '#eef2ff', color: '#4338ca' }}>
                {entry.question_type}
              </span>
            )}
          </div>

          {entry.question_content && (
            <CleanContent content={entry.question_content} tag="div" style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, marginBottom: 10 }} />
          )}

          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c' }}>你的答案：</span>
            <CleanContent content={entry.wrong_answer || '(空)'} tag="span" style={{ fontSize: 13, color: '#7f1d1d' }} />
          </div>

          {entry.reference_answer && (
            <details style={{ marginBottom: 8, fontSize: 13 }}>
              <summary style={{ cursor: 'pointer', color: '#047857', fontWeight: 600 }}>正确答案</summary>
              <div style={{ marginTop: 4, padding: '8px 12px', borderRadius: 6, background: '#ecfdf5', color: '#065f46' }}>
                {entry.reference_answer}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleGenerate(entry.id)} disabled={genLoading[entry.id]} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: genLoading[entry.id] ? '#c7d2fe' : '#4338ca', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>
              {genLoading[entry.id] ? '生成中...' : '🔄 举一反三'}
            </button>
          </div>

          {similarQuestions[entry.id] && (
            <SimilarQuestionCard
              question={similarQuestions[entry.id]}
              onDismiss={() => setSimilarQuestions((p) => { const n = { ...p }; delete n[entry.id]; return n; })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
