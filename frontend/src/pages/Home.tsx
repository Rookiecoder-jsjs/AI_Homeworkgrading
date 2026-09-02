import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TiltCard, StaggerContainer, StaggerItem } from '../motion';
import { theme } from '../theme';

const smooth = [0.16, 1, 0.3, 1] as const;

const glassCard = {
  background: 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.04)',
};

const MotionLink = motion(Link);

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#fafbfc',
      backgroundImage: `
        radial-gradient(ellipse 72% 56% at 24% 18%, rgba(99,102,241,0.07) 0%, transparent 56%),
        radial-gradient(ellipse 56% 48% at 76% 78%, rgba(5,150,105,0.06) 0%, transparent 54%),
        radial-gradient(ellipse 64% 52% at 52% 52%, rgba(99,102,241,0.03) 0%, transparent 60%)
      `,
      fontFamily: theme.font.stack,
      padding: 24,
      overflow: 'hidden',
    }}>
      {/* Animated mesh gradient blob */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: '10%', left: '5%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
        }}
      />
      <motion.div
        animate={{
          x: [0, -30, 30, 0],
          y: [0, 20, -30, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'fixed', bottom: '15%', right: '8%',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Unified Hero Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: smooth }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 52 }}
        >
          {/* Logo mark — smaller, icon-style, floated above title */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <motion.div
              animate={{
                boxShadow: [
                  '0 6px 24px rgba(99,102,241,0.22)',
                  '0 6px 36px rgba(99,102,241,0.4)',
                  '0 6px 24px rgba(99,102,241,0.22)',
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </motion.div>
            {/* Subtle ring */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.08, 0.3] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -6, borderRadius: 20,
                border: '1.5px solid rgba(99,102,241,0.2)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Title + tagline as one unit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontSize: 52, fontWeight: 900, color: '#0f172a', margin: 0,
              letterSpacing: '-1px', lineHeight: 1.1,
              fontFamily: `"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace`,
            }}>
              AI_Homeworkgrading
            </h1>
            {/* Divider — thin gradient line connecting title to subtitle */}
            <div style={{
              width: 32, height: 3, borderRadius: 2,
              background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
            }} />
            <p style={{
              fontSize: 14, color: '#64748b', margin: 0,
              maxWidth: 360, textAlign: 'center', lineHeight: 1.6,
              letterSpacing: '0.01em',
            }}>
              秒级批改 · Socratic 引导反馈 · 知识图谱诊断 · 完整学习闭环
            </p>
          </div>
        </motion.div>

        {/* Cards — fixed equal size */}
        <StaggerContainer style={{
          display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
          alignItems: 'stretch',
        }}>
          {([
            {
              emoji: '👩‍🏫', title: '教师入口',
              desc: '创建作业 · AI 辅助批改\n复核纠偏 · 班级分析 · 报告导出',
              to: '/teacher/dashboard', accent: '#6366f1', bg: '#eef2ff',
            },
            {
              emoji: '🧑‍🎓', title: '学生入口',
              desc: '提交作业 · 拍照上传 · 查看反馈\n错题订正 · 错题本 · 举一反三',
              to: '/student/dashboard', accent: '#059669', bg: '#ecfdf5',
            },
          ] as const).map((c) => (
            <StaggerItem key={c.title}>
              <TiltCard style={{ width: 280, height: '100%' }}>
                <MotionLink
                  to={c.to}
                  whileHover={{ boxShadow: `0 20px 60px ${c.accent}18, 0 2px 8px rgba(0,0,0,0.04)` }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    width: 280, minHeight: 210, padding: '30px 28px 26px', borderRadius: 22,
                    ...glassCard, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    color: 'inherit', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accent + '60'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)'; }}
                >
                  {/* Top accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, transparent, ${c.accent}80, transparent)`,
                  }} />
                  {/* Accent dot */}
                  <div style={{
                    position: 'absolute', top: 20, right: 20, width: 6, height: 6,
                    borderRadius: '50%', background: c.accent, opacity: 0.4,
                  }} />

                  <motion.div
                    whileHover={{ rotate: [0, -4, 4, 0] }}
                    transition={{ duration: 0.45 }}
                    style={{
                      width: 48, height: 48, borderRadius: 14, background: c.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, marginBottom: 18, flexShrink: 0,
                    }}
                  >{c.emoji}</motion.div>

                  <h2 style={{
                    fontSize: 20, fontWeight: 700, color: '#0f172a',
                    margin: '0 0 8px', lineHeight: 1.2, flexShrink: 0,
                  }}>{c.title}</h2>

                  <p style={{
                    fontSize: 13, color: '#64748b', margin: 0,
                    lineHeight: 1.75, whiteSpace: 'pre-line', flex: 1,
                  }}>{c.desc}</p>

                  <div style={{
                    marginTop: 16, fontSize: 12, fontWeight: 600,
                    color: c.accent, display: 'flex', alignItems: 'center', gap: 4,
                    flexShrink: 0,
                  }}>
                    进入
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    >→</motion.span>
                  </div>
                </MotionLink>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            marginTop: 52, display: 'flex', alignItems: 'center', gap: 10,
            color: '#94a3b8', fontSize: 12,
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#34d399' }}
          />
          Powered by qwen3.6-flash · DashScope
        </motion.div>
      </div>
    </div>
  );
}
