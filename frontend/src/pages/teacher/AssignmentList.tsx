import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment } from '../../types';

export default function AssignmentListPage() {
  const nav = useNavigate();
  const [list, setList] = useState<Assignment[]>([]);

  const load = () => {
    api.listAssignments().then(setList).catch(console.error);
  };
  useEffect(load, []);

  const handleDelete = async (id: number) => {
    await api.deleteAssignment(id);
    load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>📋 作业列表</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => nav('/teacher/assignments/new')}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            ➕ 创建
          </button>
          <button
            onClick={() => nav('/teacher/dashboard')}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            ← 返回
          </button>
        </div>
      </div>

      {list.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>暂无作业，创建第一份吧</p>}

      {list.map((a) => (
        <div
          key={a.id}
          onClick={() => nav(`/teacher/assignments/${a.id}`)}
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
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{a.title}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {a.subject} · {a.class_name} · {a.teacher_name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              background: a.status === 'published' ? '#dcfce7' : '#f1f5f9',
              color: a.status === 'published' ? '#16a34a' : '#64748b',
            }}>
              {a.status === 'published' ? '已发布' : a.status === 'draft' ? '草稿' : '已关闭'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
