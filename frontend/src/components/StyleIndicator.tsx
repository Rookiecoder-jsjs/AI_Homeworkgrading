const TYPE_LABELS: Record<string, string> = {
  choice: '选择题', true_false: '判断题', fill_blank: '填空题',
  short_answer: '简答题', essay: '作文/证明题',
};

interface Props {
  bias: number;
  questionType?: string;
}

export default function StyleIndicator({ bias, questionType }: Props) {
  const absBias = Math.abs(bias);
  const isLenient = bias > 0;
  const color = isLenient ? '#047857' : '#b91c1c';
  const bg = isLenient ? '#ecfdf5' : '#fef2f2';

  if (absBias < 0.3) {
    return (
      <span style={{ fontSize: 11, color: '#94a3b8' }}>≈ AI</span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      background: bg, color,
    }}>
      {isLenient ? '+' : '-'}{absBias.toFixed(1)}
      {questionType && <span style={{ opacity: 0.6, marginLeft: 2 }}>{TYPE_LABELS[questionType] || questionType}</span>}
    </span>
  );
}
