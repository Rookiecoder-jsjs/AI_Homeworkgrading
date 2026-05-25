interface Props {
  score: number;
  label: string;
}

export default function MasteryBar({ score, label }: Props) {
  const pct = Math.round(score * 100);
  const color = score < 0.4 ? '#ef4444' : score < 0.7 ? '#f59e0b' : '#10b981';
  const bg = score < 0.4 ? '#fef2f2' : score < 0.7 ? '#fffbeb' : '#ecfdf5';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#475569', minWidth: 60, textAlign: 'right' }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: color, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}
