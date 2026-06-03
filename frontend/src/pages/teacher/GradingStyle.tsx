import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import StyleIndicator from '../../components/StyleIndicator';
import { QUESTION_TYPE_LABEL } from '../../constants';
import type { TeacherStyleReport } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  ...QUESTION_TYPE_LABEL,
  '': '全部',
};

export default function GradingStylePage() {
  const nav = useNavigate();
  const [teacherName, setTeacherName] = useState('');
  const [report, setReport] = useState<TeacherStyleReport | null>(null);

  const load = (name: string) => {
    if (!name) return;
    api.getTeacherStyle(name).then(setReport).catch(console.error);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: 820, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <button onClick={() => nav('/teacher/dashboard')} style={{
        border: 'none', background: 'none', color: '#4338ca', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '0 0 16px',
      }}>
        ← 返回看板
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>批改风格分析</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>分析您的评分模式与 AI 的差异，帮助 AI 更适合您的标准</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <input
          placeholder="输入教师姓名"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(teacherName)}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, flex: 1, outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={() => load(teacherName)} style={{
          padding: '9px 28px', borderRadius: 8, border: 'none', background: '#4338ca', color: '#fff',
          fontWeight: 600, cursor: 'pointer', fontSize: 14,
        }}>分析</button>
      </div>

      {!report && (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div>输入教师姓名查看批改风格报告</div>
        </div>
      )}

      {report && report.total_overrides === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>暂无覆写记录</div>
          <div style={{ fontSize: 14 }}>教师尚未对任何 AI 批改结果进行覆写，无法分析风格。</div>
        </div>
      )}

      {report && report.total_overrides > 0 && (
        <>
          {/* Overview card */}
          <div style={{
            padding: 22, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: report.classification === 'balanced' ? '#ecfdf5' : report.classification === 'lenient' ? '#fffbeb' : '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 24 }}>
                {report.classification === 'balanced' ? '🎯' : report.classification === 'lenient' ? '😊' : '🧐'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                评分风格：
                {report.classification === 'balanced' ? ' 均衡' : report.classification === 'lenient' ? ' 偏宽松' : ' 偏严格'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                累计覆写 {report.total_overrides} 次 · 平均偏差 {report.overall_bias > 0 ? '+' : ''}{report.overall_bias.toFixed(1)} 分
              </div>
              <div style={{
                marginTop: 8, padding: '8px 14px', borderRadius: 8,
                background: '#f0f9ff', border: '1px solid #bfdbfe',
                fontSize: 13, color: '#1e40af', lineHeight: 1.6,
              }}>
                💡 {report.recommendation}
              </div>
            </div>
          </div>

          {/* Per-type breakdown */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14, color: '#334155' }}>
              按题型查看偏差
            </div>
            {report.profiles.map((p) => {
              const absBias = Math.abs(p.avg_bias);
              const barWidth = Math.min(absBias * 30, 200);
              return (
                <div key={p.question_type} style={{
                  padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 80 }}>
                    {TYPE_LABELS[p.question_type] || p.question_type}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 40 }}>
                    {p.total_overrides} 次覆写
                  </span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${barWidth}px`, height: '100%', borderRadius: 4,
                      background: p.avg_bias > 0 ? '#10b981' : '#ef4444',
                      marginLeft: p.avg_bias < 0 ? 'auto' : 0,
                    }} />
                  </div>
                  <StyleIndicator bias={p.avg_bias} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
