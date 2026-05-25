import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { StaggerContainer, StaggerItem, TiltCard } from '../../motion';
import { theme } from '../../theme';
import type { TeacherDashboard } from '../../types';

const smooth = [0.16, 1, 0.3, 1];

function CountUp({ target, duration = 800 }: { target: number | string; duration?: number }) {
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

const glassCard = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(226,232,240,0.8)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
};

export default function TeacherDashboardPage() {
  const nav = useNavigate();
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getTeacherDashboard().then(d => { setData(d); setLoaded(true); }).catch(console.error);
  }, []);

  const cards = [
    { label: '作业总数', value: data?.total_assignments ?? '—', color: '#6366f1', bg: '#eef2ff', to: '/teacher/assignments', icon: '📋' },
    { label: '提交总数', value: data?.total_submissions ?? '—', color: '#8b5cf6', bg: '#f5f3ff', to: '/teacher/assignments', icon: '📥' },
    { label: '已批改',   value: data?.graded_count ?? '—',       color: '#059669', bg: '#ecfdf5', to: '/teacher/assignments', icon: '✅' },
    { label: '待复核',   value: data?.pending_review_count ?? '—', color: '#d97706', bg: '#fffbeb', to: '/teacher/review-queue', icon: '🔍' },
    { label: '平均分',   value: data?.average_score ?? '—',      color: '#0284c7', bg: '#f0f9ff', to: '/teacher/assignments', icon: '📊' },
  ];

  return (
    <div style={{
      minHeight: '100vh', padding: '32px 24px', maxWidth: 960, margin: '0 auto',
      fontFamily: theme.font.stack,
      background: '#fafbfc',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(99,102,241,0.04) 0%, transparent 60%)',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smooth }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>教师看板</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>概览所有班级的作业情况</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/teacher/assignments')}
            style={{
              padding: '9px 22px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              boxShadow: '0 4px 14px rgba(99,102,241,0.28)',
            }}>
            作业管理
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/')}
            style={{
              padding: '9px 22px', borderRadius: 12, border: '1px solid #e2e8f0',
              background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
            返回首页
          </motion.button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <StaggerContainer style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16,
      }}>
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <TiltCard>
              <motion.div
                onClick={() => nav(c.to)}
                whileHover={{ y: -4, boxShadow: `0 16px 48px ${c.color}18` }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                style={{ padding: '22px 20px', borderRadius: 20, ...glassCard, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.color + '40'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'; }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, marginBottom: 16,
                }}>
                  <motion.div whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}>
                    {c.icon}
                  </motion.div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {c.label}
                </div>
                <div style={{
                  fontSize: 34, fontWeight: 800, color: c.color, lineHeight: 1,
                  fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                }}>
                  {loaded ? <CountUp target={c.value} /> : '—'}
                </div>
                <div style={{ marginTop: 14, fontSize: 11, color: c.color, opacity: 0.45, fontWeight: 500 }}>
                  查看详情 →
                </div>
              </motion.div>
            </TiltCard>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: smooth }}
        style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(99,102,241,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => nav('/teacher/assignments/new')}
          style={{
            padding: '14px 40px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 6px 22px rgba(99,102,241,0.3)',
          }}
        >
          + 创建新作业
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(5,150,105,0.25)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => nav('/teacher/grading-style')}
          style={{
            padding: '14px 32px', borderRadius: 16, border: '1.5px solid #059669',
            background: '#ecfdf5', color: '#059669', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          📊 批改风格分析
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(2,132,199,0.25)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => nav('/teacher/class-analytics')}
          style={{
            padding: '14px 32px', borderRadius: 16, border: '1.5px solid #0284c7',
            background: '#f0f9ff', color: '#0284c7', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          📈 班级数据分析
        </motion.button>
      </motion.div>
    </div>
  );
}
