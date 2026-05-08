import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment, Submission } from '../../types';

export default function StudentAssignmentListPage() {
  const nav = useNavigate();
  const name = localStorage.getItem('student_name') || '';
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubs, setMySubs] = useState<Submission[]>([]);

  useEffect(() => {
    api.listAssignments('published').then(setAssignments).catch(console.error);
    api.listSubmissions().then((all) => {
      setMySubs(all.filter((s: any) => s.student_name === name));
    }).catch(console.error);
  }, [name]);

  const getStatus = (asgId: number) => {
    const sub = mySubs.find(s => s.assignment_id === asgId);
    return sub ? { submitted: true, id: sub.id, status: sub.status } : { submitted: false, id: null, status: '' };
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => nav('/student/dashboard')} style={{
          border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0,
        }}>
          ← 返回看板
        </button>
        <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' }}>我的作业</h1>
      </div>

      {assignments.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>暂无作业</p>}

      {assignments.map((a) => {
        const s = getStatus(a.id);
        return (
          <div
            key={a.id}
            onClick={() => s.submitted ? nav(`/student/submissions/${s.id}`) : nav(`/student/assignments/${a.id}`)}
            style={{
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              background: '#fff',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{a.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {a.subject} · {a.teacher_name} · 截止 {a.due_date || '不限'}
              </div>
            </div>
            <span style={{
              padding: '4px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              background: !s.submitted ? '#f1f5f9'
                : s.status === 'reviewed' ? '#dcfce7'
                : s.status === 'graded' ? '#fef3c7'
                : s.status === 'corrected' ? '#e0e7ff'
                : '#e0f2fe',
              color: !s.submitted ? '#64748b'
                : s.status === 'reviewed' ? '#16a34a'
                : s.status === 'graded' ? '#d97706'
                : s.status === 'corrected' ? '#4f46e5'
                : '#0369a1',
            }}>
              {!s.submitted ? '去提交'
                : s.status === 'reviewed' ? '✓ 已复核'
                : s.status === 'graded' ? 'AI 已批改'
                : s.status === 'corrected' ? '已订正'
                : '等待批改'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
