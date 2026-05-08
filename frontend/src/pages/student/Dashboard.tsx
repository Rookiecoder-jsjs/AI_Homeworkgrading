import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { StudentDashboard } from '../../types';

export default function StudentDashboardPage() {
  const nav = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem('student_name') || '');
  const [data, setData] = useState<StudentDashboard | null>(null);

  const load = (n: string) => {
    if (!n) return;
    localStorage.setItem('student_name', n);
    api.getStudentDashboard(n).then(setData).catch(console.error);
  };

  useEffect(() => {
    if (name) load(name);
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>🧑‍🎓 学生看板</h1>
        <button onClick={() => nav('/')} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
          返回首页
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          placeholder="输入你的姓名"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(name)}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, flex: 1 }}
        />
        <button
          onClick={() => load(name)}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          查询
        </button>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '待完成作业', value: data.total_assignments },
            { label: '已完成', value: data.completed_count },
            { label: '平均得分', value: data.average_score },
          ].map(c => (
            <div key={c.label} style={{ padding: 20, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {name && (
        <button
          onClick={() => nav('/student/assignments')}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
        >
          📋 查看我的作业
        </button>
      )}
    </div>
  );
}
