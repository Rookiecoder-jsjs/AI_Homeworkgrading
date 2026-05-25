interface SimilarQuestion {
  question_content: string;
  reference_answer: string;
  hint: string;
  knowledge_points: string[];
}

interface Props {
  question: SimilarQuestion;
  onDismiss: () => void;
}

export default function SimilarQuestionCard({ question, onDismiss }: Props) {
  return (
    <div style={{
      padding: 18, borderRadius: 14, background: '#fff',
      border: '2px solid #c7d2fe', marginTop: 12,
      animation: 'fadeInUp 0.3s cubic-bezier(0.4,0,0.2,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>🔄</span>
        <span style={{ fontWeight: 700, color: '#4338ca', fontSize: 13 }}>变式练习题</span>
        <button onClick={onDismiss} style={{
          marginLeft: 'auto', border: 'none', background: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
        }}>✕</button>
      </div>

      <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, marginBottom: 12 }}>
        {question.question_content}
      </div>

      {question.knowledge_points.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {question.knowledge_points.map((kp) => (
            <span key={kp} style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: '#eef2ff', color: '#4338ca',
            }}>{kp}</span>
          ))}
        </div>
      )}

      {question.hint && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: '#fffbeb',
          border: '1px solid #fde68a', fontSize: 13, color: '#92400e', lineHeight: 1.6, marginBottom: 10,
        }}>
          💡 <strong>提示：</strong>{question.hint}
        </div>
      )}

      {question.reference_answer && (
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: 'pointer', color: '#4338ca', fontWeight: 600 }}>查看答案</summary>
          <div style={{
            marginTop: 8, padding: '10px 14px', borderRadius: 8,
            background: '#ecfdf5', border: '1px solid #a7f3d0',
            color: '#065f46', lineHeight: 1.7,
          }}>
            {question.reference_answer}
          </div>
        </details>
      )}
    </div>
  );
}
