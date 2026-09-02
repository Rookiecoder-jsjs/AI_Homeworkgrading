import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { ClassOverview, HeatmapItem, TrendPoint } from '../../types';

export default function ClassAnalyticsPage() {
  const nav = useNavigate();
  const [classes, setClasses] = useState<ClassOverview[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getClassOverview().then(setClasses).catch(console.error);
  }, []);

  const loadClass = async (className: string) => {
    setSelectedClass(className);
    setLoading(true);
    const [hm, tr] = await Promise.all([
      api.getKnowledgeHeatmap(className).catch(() => []),
      api.getTrends(className).catch(() => []),
    ]);
    setHeatmap(hm);
    setTrends(tr);
    setLoading(false);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif' }}>
      <button onClick={() => nav('/teacher/dashboard')} style={{
        border: 'none', background: 'none', color: '#4338ca', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '0 0 16px',
      }}>← 返回看板</button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>班级数据分析</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>按班级查看成绩分布、知识点掌握度和趋势变化</p>

      {/* Class overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {classes.map((c) => (
          <button key={c.class_name} type="button" onClick={() => loadClass(c.class_name)} aria-pressed={selectedClass === c.class_name} style={{
            padding: 18, borderRadius: 14, background: '#fff',
            border: selectedClass === c.class_name ? '2px solid #4338ca' : '1px solid #e2e8f0',
            cursor: 'pointer', transition: 'all 0.15s',
            textAlign: 'left', font: 'inherit', color: 'inherit',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{c.class_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{c.unique_students || c.student_count} 名学生</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4338ca' }}>{Math.round(c.avg_score)} <span style={{ fontSize: 12, color: '#94a3b8' }}>均分</span></div>
          </button>
        ))}
      </div>

      {selectedClass && loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>加载中...</div>}

      {selectedClass && !loading && (
        <>
          {/* Knowledge heatmap */}
          {heatmap.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                📊 {selectedClass} 知识点掌握度
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {heatmap.map((item) => {
                  const pct = Math.round(item.mastery_pct * 100);
                  const color = pct < 40 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={item.knowledge_point_name} style={{
                      padding: 12, borderRadius: 10, textAlign: 'center',
                      background: '#fff', border: '1px solid #e2e8f0',
                    }}>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.knowledge_point_name}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trends */}
          {trends.length > 0 && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                📈 {selectedClass} 成绩趋势
              </h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px 24px', borderBottom: '1px solid #e2e8f0' }}>
                {trends.slice().reverse().map((t) => {
                  const maxScore = Math.max(...trends.map(x => x.avg_score), 1);
                  const h = Math.max(4, (t.avg_score / maxScore) * 100);
                  return (
                    <div key={t.period_label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#4338ca' }}>{t.avg_score}</span>
                      <div style={{
                        width: '100%', maxWidth: 40, height: h, borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(180deg, #818cf8, #4338ca)',
                        transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                      <span style={{ fontSize: 9, color: '#94a3b8', transform: 'rotate(-30deg)', marginTop: 4 }}>{t.period_label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
