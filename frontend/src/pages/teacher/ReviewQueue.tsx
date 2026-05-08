import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReviewItem {
  id: number;
  assignment_id: number;
  student_name: string;
  status: string;
  submitted_at: string;
  assignment_title: string;
  low_conf_count: number;
}

export default function ReviewQueuePage() {
  const nav = useNavigate();
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard/review-queue')
      .then((r) => r.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => nav('/teacher/dashboard')}
          style={{ border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 14 }}
        >
          ← 返回看板
        </button>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>🔍 待复核队列</h1>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          padding: '2px 10px',
          borderRadius: 20,
          background: '#fef3c7',
          color: '#d97706',
        }}>
          {items.length} 份提交
        </span>
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>没有待复核的提交</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>所有低置信度项都已处理完毕</div>
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => nav(`/teacher/submissions/${item.id}`)}
          style={{
            padding: 16,
            borderRadius: 12,
            marginBottom: 10,
            background: '#fff',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 3 }}>
              {item.student_name}
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: 13 }}>
                {item.assignment_title}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{item.submitted_at}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: '#fef2f2',
              color: '#dc2626',
            }}>
              {item.low_conf_count} 项低置信度
            </span>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}
