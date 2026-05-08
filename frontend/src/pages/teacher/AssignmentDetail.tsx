import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment, Submission } from '../../types';

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [batchGrading, setBatchGrading] = useState(false);

  const load = () => {
    if (!id) return;
    api.getAssignment(+id).then(setAssignment).catch(console.error);
    api.listSubmissions(+id).then(setSubmissions).catch(console.error);
  };
  useEffect(load, [id]);

  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;

  const handleBatchGrade = async () => {
    if (!id || pendingCount === 0) return;
    setBatchGrading(true);
    try {
      const result = await api.triggerBatchGrading(+id);
      alert(`批改完成：${result.graded}/${result.total} 份`);
      load();
    } catch (e: any) {
      alert('批量批改失败：' + e.message);
    }
    setBatchGrading(false);
  };

  if (!assignment) return <div style={{ padding: 24 }}>加载中...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <button
        onClick={() => nav('/teacher/assignments')}
        style={{ border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}
      >
        ← 返回作业列表
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{assignment.title}</h1>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            {assignment.subject} · {assignment.class_name} · {assignment.teacher_name}
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleBatchGrade}
            disabled={batchGrading}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: batchGrading ? '#a5b4fc' : '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: batchGrading ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
            }}
          >
            {batchGrading ? '🤖 批改中...' : `🤖 批量 AI 批改（${pendingCount} 份）`}
          </button>
        )}
      </div>

      {assignment.description && <p style={{ color: '#475569', marginTop: 12 }}>{assignment.description}</p>}

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>
        📥 学生提交（{submissions.length}）
      </h2>
      {submissions.length === 0 && <p style={{ color: '#94a3b8' }}>暂无提交</p>}
      {submissions.map((s) => (
        <div
          key={s.id}
          onClick={() => nav(`/teacher/submissions/${s.id}`)}
          style={{
            padding: 14,
            borderRadius: 10,
            marginBottom: 8,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.student_name}</span>
              {(s as any).low_conf_count > 0 && (
                <span style={{
                  padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: '#fef2f2', color: '#b91c1c',
                }}>⚠️ {(s as any).low_conf_count}</span>
              )}
              {(s as any).reviewed_count > 0 && (s as any).reviewed_count >= (s as any).total_answers && (
                <span style={{ fontSize: 11, color: '#047857' }}>✓ 全部确认</span>
              )}
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{s.submitted_at}</span>
          </div>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              background:
                s.status === 'graded' ? '#fef3c7' :
                s.status === 'reviewed' ? '#dcfce7' :
                s.status === 'corrected' ? '#e0e7ff' :
                '#f1f5f9',
              color:
                s.status === 'graded' ? '#d97706' :
                s.status === 'reviewed' ? '#16a34a' :
                s.status === 'corrected' ? '#4f46e5' :
                '#64748b',
            }}
          >
            {s.status === 'submitted' ? '待批改' :
             s.status === 'grading' ? '批改中...' :
             s.status === 'graded' ? '待复核' :
             s.status === 'reviewed' ? '✓ 已复核' :
             s.status === 'corrected' ? '已订正' : s.status}
          </span>
        </div>
      ))}
    </div>
  );
}
