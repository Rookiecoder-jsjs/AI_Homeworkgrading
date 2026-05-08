interface Props { confidence: number | null }

export default function ConfidenceBadge({ confidence }: Props) {
  if (confidence === null || confidence === undefined) return null;

  const pct = Math.round(confidence * 100);
  const isHigh = confidence > 0.9;
  const isMid = confidence >= 0.7;

  const style = isHigh
    ? { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', label: '高置信度' }
    : isMid
      ? { color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: '中置信度' }
      : { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: '低置信度' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.dot,
          boxShadow: `0 0 0 2px ${style.dot}30`,
        }}
      />
      {style.label} &middot; {pct}%
    </span>
  );
}
