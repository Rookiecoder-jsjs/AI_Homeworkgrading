import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { TiltCard } from '../../motion';
import MasteryBar from '../../components/MasteryBar';
import { theme } from '../../theme';
import type { StudentDashboard } from '../../types';

const smooth = [0.16, 1, 0.3, 1];

function CountUp({ target, duration = 700 }: { target: number | string; duration?: number }) {
  const [val, setVal] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (typeof target === 'string') { setVal(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  if (typeof target === 'string') return <>{target}</>;
  return <>{val}</>;
}

export default function StudentDashboardPage() {
  const nav = useNavigate();
  const [name, setName] = useState(() => localStorage.getItem('student_name') || '');
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = (n: string) => {
    if (!n) return;
    localStorage.setItem('student_name', n);
    api.getStudentDashboard(n).then(d => { setData(d); setLoaded(true); }).catch(console.error);
  };

  useEffect(() => {
    if (name) load(name);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', padding: '32px 24px', maxWidth: 780, margin: '0 auto',
      fontFamily: theme.font.stack,
      background: '#fafbfc',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(5,150,105,0.04) 0%, transparent 60%)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>学生看板</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>查看作业进度与学习诊断</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => nav('/')}
          style={{
            padding: '9px 22px', borderRadius: 12, border: '1px solid #e2e8f0',
            background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
          返回首页
        </motion.button>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: smooth }}
        style={{
          display: 'flex', gap: 12, marginBottom: 28,
          padding: 6, borderRadius: 16, background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        <input
          placeholder="输入你的姓名"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(name)}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
            background: 'transparent', color: '#1e293b',
          }}
        />
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => load(name)}
          style={{
            padding: '12px 32px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            boxShadow: '0 4px 14px rgba(5,150,105,0.28)',
          }}>
          查询
        </motion.button>
      </motion.div>

      {data && (
        <>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: '待完成作业', value: data.total_assignments, color: '#6366f1', bg: '#eef2ff' },
              { label: '已完成', value: data.completed_count, color: '#059669', bg: '#ecfdf5' },
              { label: '平均得分', value: data.average_score, color: '#d97706', bg: '#fffbeb' },
            ].map(c => (
              <TiltCard key={c.label}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: 20, borderRadius: 20, cursor: 'default',
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(226,232,240,0.8)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {c.label}
                  </div>
                  <div style={{
                    fontSize: 32, fontWeight: 800, color: c.color, lineHeight: 1,
                    fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {loaded ? <CountUp target={c.value} /> : '—'}
                  </div>
                </motion.div>
              </TiltCard>
            ))}
          </div>

          {/* Mastery section */}
          {data.weak_point_details && data.weak_point_details.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: smooth }}
              style={{
                padding: 20, borderRadius: 20, marginBottom: 28,
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(253,230,138,0.6)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                知识点掌握度
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.weak_point_details.map((wp) => (
                  <MasteryBar key={wp.knowledge_point_name} score={wp.mastery_score} label={wp.knowledge_point_name} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Legacy weak points fallback */}
          {data.weak_points.length > 0 && data.weak_point_details.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{
                padding: 20, borderRadius: 20, marginBottom: 28,
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(253,230,138,0.6)',
              }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309', marginBottom: 12 }}>📌 需要加强的知识点</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.weak_points.map((wp) => (
                  <span key={wp} style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                    background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
                  }}>{wp}</span>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Actions */}
      {name && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: smooth }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(5,150,105,0.35)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => nav('/student/assignments')}
            style={{
              width: '100%', padding: 16, borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(5,150,105,0.25)',
            }}>
            📋 查看我的作业
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => nav('/student/error-book')}
            style={{
              width: '100%', padding: 16, borderRadius: 16,
              border: '1.5px solid #c7d2fe',
              background: 'rgba(238,242,255,0.6)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: '#4338ca', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
            📖 我的错题本
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
