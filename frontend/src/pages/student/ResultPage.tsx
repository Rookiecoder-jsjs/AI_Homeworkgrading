import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { StaggerContainer, StaggerItem } from '../../motion';
import type { Submission } from '../../types';
import GradingResult from '../../components/GradingResult';

const smooth = [0.16, 1, 0.3, 1];

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [sub, setSub] = useState<Submission | null>(null);

  const load = () => { if (id) api.getSubmission(+id).then(setSub).catch(console.error); };
  useEffect(load, [id]);

  if (!sub) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>加载中...</div>;

  const isGraded = sub.status === 'graded' || sub.status === 'reviewed' || sub.status === 'corrected';
  const allGraded = sub.answers?.every((a) => a.is_correct !== null);
  const correctCount = sub.answers?.filter((a) => a.is_correct).length ?? 0;
  const totalCount = sub.answers?.length ?? 0;
  const totalScore = sub.answers?.reduce((s, a) => s + (a.score ?? 0), 0) ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => nav('/student/assignments')} style={{ border: 'none', background: 'none', color: '#047857', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
          ← 返回作业列表
        </button>
        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>批改结果</span>
        <div style={{ flex: 1 }} />
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
            background: isGraded
              ? sub.status === 'reviewed' ? '#dcfce7' : '#fef3c7'
              : '#f1f5f9',
            color: isGraded
              ? sub.status === 'reviewed' ? '#047857' : '#b45309'
              : '#64748b',
          }}
        >
          {sub.status === 'reviewed' ? '✓ 教师已复核'
            : sub.status === 'graded' ? 'AI 已批改'
            : sub.status === 'corrected' ? '已订正重批'
            : '⏳ 等待教师批改'}
        </motion.span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 96px' }}>
        {/* Waiting state */}
        {!isGraded && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: smooth }}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '32px 28px', marginBottom: 28, textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: 40, marginBottom: 12 }}
            >⏳</motion.div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#334155', marginBottom: 4 }}>等待教师批改</div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>老师触发 AI 批改后，你将在这里看到详细的批改结果和反馈</div>
          </motion.div>
        )}

        {/* Score ring */}
        {isGraded && allGraded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: smooth }}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}
          >
            <motion.div
              initial={{ '--pct': 0 } as any}
              animate={{ '--pct': correctCount / Math.max(totalCount, 1) }}
              transition={{ duration: 1, ease: smooth }}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `conic-gradient(#047857 calc(var(--pct, 0) * 360deg), #e2e8f0 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalScore}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>得分</span>
              </div>
            </motion.div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                {correctCount === totalCount ? '🎉 全部正确！' : `${correctCount}/${totalCount} 题正确`}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {correctCount === totalCount ? '太棒了，继续保持！' : '看看下面的反馈，尝试订正错题吧'}
              </div>
            </div>
          </motion.div>
        )}

        {sub.image_url && (
          <div style={{ marginBottom: 28, borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img src={`http://localhost:8000${sub.image_url}`} alt="作业照片" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <StaggerContainer>
          {(sub.answers ?? []).map((ans) => {
            const q = sub.questions?.find((q) => q.id === ans.question_id);
            const typeLabel = typeMap[q?.type ?? ''] ?? q?.type;
            return (
              <StaggerItem key={ans.id}>
                <motion.div
                  whileHover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}
                  style={{ marginBottom: 20, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
                >
                  <div style={{ padding: '14px 20px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 8,
                      background: ans.is_correct ? '#ecfdf5' : '#fef2f2',
                      color: ans.is_correct ? '#047857' : '#b91c1c', fontSize: 12, fontWeight: 700,
                    }}>{ans.is_correct ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', background: '#eef2ff', padding: '2px 10px', borderRadius: 6 }}>{typeLabel}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>&middot; {q?.points ?? 0} 分</span>
                  </div>
                  <div style={{ padding: '16px 20px 0' }}>
                    {q?.image_url && (
                      <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <img src={`http://localhost:8000${q.image_url}`} alt="题目图片" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', background: '#fafbfc' }} />
                      </div>
                    )}
                    {q && <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 12px' }}>{q.content}</p>}
                    <GradingResult answer={ans} questionType={q?.type} readOnly />
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {isGraded && allGraded && correctCount < totalCount && (
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(67,56,202,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => nav(`/student/submissions/${id}/correct`)}
            style={{
              width: '100%', padding: 16, borderRadius: 14, border: 'none',
              background: '#4338ca', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(67,56,202,0.25)',
              marginTop: 8,
            }}
          >
            错题订正
          </motion.button>
        )}
      </div>
    </div>
  );
}

const typeMap: Record<string, string> = {
  choice: 'CHOICE', true_false: 'TRUE/FALSE', fill_blank: 'FILL',
  short_answer: 'SHORT', essay: 'ESSAY',
};
