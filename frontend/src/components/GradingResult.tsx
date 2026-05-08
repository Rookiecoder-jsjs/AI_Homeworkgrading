import type { Answer } from '../types';
import ConfidenceBadge from './ConfidenceBadge';
import SocraticFeedback from './SocraticFeedback';

interface Props {
  answer: Answer;
  questionType?: string;
  onOverride?: (answerId: number, isCorrect: boolean, score: number, comment: string) => void;
  readOnly?: boolean;
}

const statusChip = (isCorrect: boolean | null) => {
  if (isCorrect === true)  return { icon: '✓', label: '正确', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  if (isCorrect === false) return { icon: '✗', label: '错误', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  return { icon: '—', label: '待批改', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
};

export default function GradingResult({ answer, questionType, onOverride, readOnly }: Props) {
  const chip = statusChip(answer.is_correct);

  return (
    <div style={{ padding: '0 0 18px' }}>
      {/* Per-question image */}
      {answer.image_url && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={`http://localhost:8000${answer.image_url}`}
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
            student answer
          </div>
          <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
            {answer.student_answer}
          </div>
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
            👩‍🏫 teacher note
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
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>复核：</span>
          <button onClick={() => onOverride(answer.id, true, answer.score, '')} style={{
            padding: '4px 14px', borderRadius: 6, border: '1px solid #a7f3d0',
            background: '#f0fdf4', color: '#047857', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            ✓ 确认正确
          </button>
          <button onClick={() => onOverride(answer.id, false, 0, '')} style={{
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
