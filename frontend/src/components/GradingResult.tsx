import { useState } from 'react';
import type { Answer } from '../types';
import CleanContent from './CleanContent';
import ConfidenceBadge from './ConfidenceBadge';
import SocraticFeedback from './SocraticFeedback';

interface Props {
  answer: Answer;
  maxPoints?: number;
  onOverride?: (answerId: number, isCorrect: boolean, score: number, comment: string) => Promise<void> | void;
  readOnly?: boolean;
}

const statusChip = (isCorrect: boolean | null) => {
  if (isCorrect === true)  return { icon: '✓', label: '正确', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  if (isCorrect === false) return { icon: '✗', label: '错误', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  return { icon: '—', label: '待批改', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
};

export default function GradingResult({ answer, maxPoints = 0, onOverride, readOnly }: Props) {
  const chip = statusChip(answer.is_correct);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(answer.score);
  const [comment, setComment] = useState(answer.teacher_comment);

  const handleOverride = async (isCorrect: boolean, nextScore: number) => {
    if (!onOverride || saving) return;
    setSaving(true);
    try {
      await onOverride(answer.id, isCorrect, nextScore, comment.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      alert(`保存复核结果失败：${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '0 0 18px' }}>
      {/* Per-question image */}
      {answer.image_url && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={answer.image_url}
            alt="题目照片"
            style={{
              maxWidth: '100%', maxHeight: 220, borderRadius: 8,
              border: '1px solid #e2e8f0', display: 'block',
            }}
          />
        </div>
      )}

      {/* Student answer */}
      {answer.student_answer && (
        <div style={{
          marginBottom: 12, padding: '12px 14px', borderRadius: 10,
          background: '#f8fafc', border: '1px solid #e2e8f0',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4,
          }}>
            学生答案
          </div>
          <CleanContent content={answer.student_answer} tag="div" style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }} />
        </div>
      )}

      {/* Status + score + confidence row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
          }}>
            {chip.icon} {chip.label}
          </span>
          {answer.score > 0 && (
            <span style={{
              fontSize: 13, fontWeight: 700, color: '#4338ca',
              background: '#eef2ff', padding: '2px 10px', borderRadius: 20,
            }}>
              +{answer.score} 分
            </span>
          )}
        </div>
        {answer.ai_confidence !== null && <ConfidenceBadge confidence={answer.ai_confidence} />}
      </div>

      {/* AI Feedback */}
      <SocraticFeedback feedback={answer.ai_feedback} isCorrect={answer.is_correct} />

      {/* Teacher comment */}
      {answer.teacher_comment && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: '#eff6ff', border: '1px solid #bfdbfe',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#3b82f6', marginBottom: 2,
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            👩‍🏫 教师评语
          </div>
          <div style={{ fontSize: 14, color: '#1e40af', lineHeight: 1.6 }}>
            {answer.teacher_comment}
          </div>
        </div>
      )}

      {/* Teacher override controls */}
      {!readOnly && onOverride && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: '1px dashed #e2e8f0',
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>复核：</span>
          <label htmlFor={`score-${answer.id}`} style={{ fontSize: 12, color: '#64748b' }}>得分</label>
          <input
            id={`score-${answer.id}`}
            type="number"
            min={0}
            max={maxPoints}
            value={score}
            onChange={(event) => setScore(Math.max(0, Math.min(maxPoints, Number(event.target.value) || 0)))}
            disabled={saving}
            aria-label={`第 ${answer.id} 题得分`}
            style={{ width: 64, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>/ {maxPoints} 分</span>
          <label htmlFor={`comment-${answer.id}`} style={{ flexBasis: '100%', fontSize: 12, color: '#64748b' }}>教师评语（可选）</label>
          <textarea
            id={`comment-${answer.id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={saving}
            rows={2}
            maxLength={5000}
            placeholder="补充这道题的评语..."
            style={{ flexBasis: '100%', resize: 'vertical', padding: '7px 9px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit' }}
          />
          <button
            type="button"
            onClick={() => handleOverride(true, score > 0 ? score : maxPoints)}
            disabled={saving}
            aria-busy={saving}
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid #a7f3d0',
              background: '#f0fdf4', color: '#047857', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            ✓ 确认正确
          </button>
          <button
            type="button"
            onClick={() => handleOverride(false, 0)}
            disabled={saving}
            aria-busy={saving}
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid #fecaca',
              background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            ✗ 标记错误
          </button>
        </div>
      )}
    </div>
  );
}
