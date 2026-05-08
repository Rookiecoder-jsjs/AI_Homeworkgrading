import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { StaggerContainer, StaggerItem } from '../../motion';
import type { Submission } from '../../types';
import GradingResult from '../../components/GradingResult';

export default function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [sub, setSub] = useState<Submission | null>(null);
  const [grading, setGrading] = useState(false);
  const [autoApproving, setAutoApproving] = useState(false);
  const [showHighConf, setShowHighConf] = useState(false);

  const load = () => { if (id) api.getSubmission(+id).then(setSub).catch(console.error); };
  useEffect(load, [id]);

  const handleGrade = async () => {
    if (!id) return;
    setGrading(true);
    await api.triggerGrading(+id);
    setGrading(false);
    load();
  };

  const handleAutoApprove = async () => {
    if (!id || !sub) return;
    setAutoApproving(true);
    // Batch approve all high-confidence answers
    const highConf = (sub.answers ?? []).filter(
      (a) => a.is_correct !== null && (a.ai_confidence ?? 0) > 0.9 && a.teacher_override === 0
    );
    for (const a of highConf) {
      await api.overrideAnswer(a.id, { is_correct: a.is_correct, score: a.score, teacher_comment: '' }).catch(() => {});
    }
    setAutoApproving(false);
    load();
  };

  if (!sub) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>加载中...</div>;

  const answers = sub.answers ?? [];
  const gradedCount = answers.filter((a) => a.is_correct !== null).length;
  const highConfCount = answers.filter((a) => (a.ai_confidence ?? 0) > 0.9 && a.teacher_override === 0).length;
  const lowConfCount = answers.filter((a) => a.is_correct !== null && (a.ai_confidence ?? 1) < 0.7 && a.teacher_override === 0).length;
  const reviewedCount = answers.filter((a) => a.teacher_override === 1).length;
  const isAllReviewed = reviewedCount === answers.length;

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => nav(`/teacher/assignments/${sub.assignment_id}`)} style={backBtn}>← 返回</button>
        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>批改复核</span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          {sub.student_name} &middot; {gradedCount}/{answers.length} 已批改
          {isAllReviewed && <span style={{ color: '#047857', fontWeight: 600 }}> &middot; 全部已确认</span>}
        </span>
        <div style={{ flex: 1 }} />
        {sub.status === 'submitted' ? (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleGrade} disabled={grading}
            style={btnPrimary(grading)}>
            {grading ? 'AI 批改中...' : '🤖 触发 AI 批改'}
          </motion.button>
        ) : (
          <>
            {/* Summary badges */}
            {highConfCount > 0 && (
              <span style={{ fontSize: 12, color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                ✅ {highConfCount} 高置信度
              </span>
            )}
            {lowConfCount > 0 && (
              <span style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                ⚠️ {lowConfCount} 需复核
              </span>
            )}
            {!isAllReviewed && highConfCount > 0 && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleAutoApprove} disabled={autoApproving}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: autoApproving ? '#86efac' : '#047857', color: '#fff',
                  fontWeight: 600, fontSize: 12, cursor: autoApproving ? 'default' : 'pointer',
                }}>
                {autoApproving ? '确认中...' : '一键确认高置信度'}
              </motion.button>
            )}
            {/* Toggle show high confidence */}
            {answers.some((a) => (a.ai_confidence ?? 0) > 0.9) && (
              <button onClick={() => setShowHighConf(!showHighConf)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
                {showHighConf ? '折叠已通过' : '显示全部'}
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 96px' }}>
        {sub.image_url && (
          <div style={{ marginBottom: 28, borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img src={`http://localhost:8000${sub.image_url}`} alt="作业照片" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <StaggerContainer>
          {answers.map((ans, i) => {
            const q = sub.questions?.find((q) => q.id === ans.question_id);
            const typeLabel = typeMap[q?.type ?? ''] ?? q?.type;
            const isHighConf = (ans.ai_confidence ?? 0) > 0.9 && ans.teacher_override === 0;
            const isLowConf = ans.is_correct !== null && (ans.ai_confidence ?? 1) < 0.7 && ans.teacher_override === 0;
            const isReviewed = ans.teacher_override === 1;

            // Auto-collapse high-confidence items when not showing all
            const collapsed = isHighConf && !showHighConf;

            return (
              <StaggerItem key={ans.id}>
                <motion.div
                  whileHover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}
                  style={{
                    marginBottom: 20, background: '#fff', borderRadius: 14,
                    border: isLowConf ? '2px solid #fecaca' : isHighConf ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                    overflow: 'hidden', opacity: collapsed ? 0.5 : 1,
                    transition: 'opacity 0.2s, border-color 0.2s',
                  }}
                >
                  <div style={{
                    padding: '14px 20px', background: isLowConf ? '#fef2f2' : isHighConf ? '#f0fdf4' : '#fafbfc',
                    borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 8,
                      background: isLowConf ? '#fef2f2' : isHighConf ? '#ecfdf5' : '#eef2ff',
                      color: isLowConf ? '#b91c1c' : isHighConf ? '#047857' : '#4338ca',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {isHighConf ? '✓' : i + 1}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', background: '#eef2ff', padding: '2px 10px', borderRadius: 6 }}>{typeLabel}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>&middot; {q?.points ?? 0} 分</span>
                    {isHighConf && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✅ 自动通过</span>}
                    {isLowConf && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>⚠️ 需复核</span>}
                    {isReviewed && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4338ca', fontWeight: 600 }}>👩‍🏫 已确认</span>}
                    {collapsed && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>已折叠</span>}
                  </div>
                  {!collapsed && (
                    <div style={{ padding: '16px 20px 0' }}>
                      {q?.image_url && (
                        <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={`http://localhost:8000${q.image_url}`} alt="题目图片" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', background: '#fafbfc' }} />
                        </div>
                      )}
                      {q && <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 12px' }}>{q.content}</p>}
                      <GradingResult answer={ans} questionType={q?.type}
                        onOverride={async (aid, correct, sc, comment) => {
                          await api.overrideAnswer(aid, { is_correct: correct, score: sc, teacher_comment: comment });
                          load();
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </div>
  );
}

const typeMap: Record<string, string> = {
  choice: 'CHOICE', true_false: 'TRUE/FALSE', fill_blank: 'FILL',
  short_answer: 'SHORT', essay: 'ESSAY',
};
const backBtn: React.CSSProperties = {
  border: 'none', background: 'none', color: '#4338ca', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
};
const btnPrimary = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 22px', borderRadius: 10, border: 'none',
  background: disabled ? '#a5b4fc' : '#4338ca', color: '#fff',
  fontWeight: 700, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
  boxShadow: disabled ? undefined : '0 2px 8px rgba(67,56,202,0.2)',
});
