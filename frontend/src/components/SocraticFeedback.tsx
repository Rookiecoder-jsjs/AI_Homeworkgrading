import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface Props { feedback: string; isCorrect: boolean | null }

export default function SocraticFeedback({ feedback, isCorrect }: Props) {
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  if (!feedback) return null;

  if (isCorrect) {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: '#ecfdf5',
        border: '1px solid #a7f3d0',
        fontSize: 14,
        lineHeight: 1.7,
        color: '#065f46',
        animation: 'fadeIn 0.3s ease both',
      }}>
        <MarkdownRenderer content={feedback} />
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #fde68a',
      background: '#fff',
      animation: 'fadeInUp 0.35s ease both',
    }}>
      <div style={{
        padding: '10px 14px',
        background: '#fffbeb',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        borderBottom: level > 0 ? '1px solid #fde68a' : 'none',
        transition: 'border 0.2s',
      }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>💡</span>
        <span style={{ fontWeight: 600, color: '#92400e', fontSize: 13 }}>思考引导</span>
        {level > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a16207', background: '#fef3c7', padding: '1px 8px', borderRadius: 10 }}>
            Lv {level}
          </span>
        )}
      </div>
      <div style={{ padding: '14px' }}>
        {level === 0 && (
          <>
            <p style={{ fontSize: 14, color: '#78716c', margin: '0 0 12px', lineHeight: 1.65 }}>
              先尝试自己找出问题所在，这样印象会更深刻。
            </p>
            <button onClick={() => setLevel(1)} style={{
              padding: '7px 18px', borderRadius: 8, border: '1px solid #d97706',
              background: '#fff', color: '#b45309', cursor: 'pointer', fontSize: 13,
              fontWeight: 600, transition: 'all 0.15s',
            }}>
              💡 给我一点提示
            </button>
          </>
        )}
        {level === 1 && (
          <>
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
              <MarkdownRenderer content={feedback} />
            </div>
            <button onClick={() => setLevel(2)} style={{
              marginTop: 12, padding: '7px 18px', borderRadius: 8, border: 'none',
              background: '#b45309', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              📖 展开完整解析
            </button>
          </>
        )}
        {level === 2 && (
          <>
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 12 }}>
              <MarkdownRenderer content={feedback} />
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
                🌱 希望这些提示能帮到你。试试修改答案吧！
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
