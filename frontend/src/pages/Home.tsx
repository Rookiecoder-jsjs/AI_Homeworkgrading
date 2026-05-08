import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScaleIn, StaggerContainer, StaggerItem } from '../motion';

const smooth = [0.16, 1, 0.3, 1];

export default function Home() {
  const nav = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#fafbfc',
      backgroundImage: `
        radial-gradient(ellipse 80% 60% at 30% 20%, rgba(67,56,202,0.05) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 70% 80%, rgba(4,120,87,0.04) 0%, transparent 60%)
      `,
      fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif',
      padding: 24,
    }}>
      {/* Accent line */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #4338ca, #818cf8, #34d399, #047857)',
        zIndex: 10,
      }} />

      {/* Logo with pulse */}
      <ScaleIn>
        <motion.div
          animate={{ boxShadow: [
            '0 8px 32px rgba(67,56,202,0.2)',
            '0 8px 40px rgba(67,56,202,0.35)',
            '0 8px 32px rgba(67,56,202,0.2)',
          ]}}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 64, height: 64, borderRadius: 18,
            background: '#4338ca', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 28,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </motion.div>
      </ScaleIn>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: smooth }}
        style={{ fontSize: 38, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}
      >
        AI 作业批改
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: smooth }}
        style={{ fontSize: 16, color: '#64748b', margin: '8px 0 52px', maxWidth: 340, textAlign: 'center' }}
      >
        秒级批改 &middot; Socratic 引导反馈 &middot; 完整学习闭环
      </motion.p>

      {/* Cards */}
      <StaggerContainer style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {([
          { emoji: '👩‍🏫', title: '教师入口', desc: '创建作业 · AI 辅助批改 · 复核纠偏',
            to: '/teacher/dashboard', accent: '#4338ca', bg: '#eef2ff' },
          { emoji: '🧑‍🎓', title: '学生入口', desc: '提交作业 · 拍照上传 · 查看反馈 · 错题订正',
            to: '/student/dashboard', accent: '#047857', bg: '#ecfdf5' },
        ] as const).map((c) => (
          <StaggerItem key={c.title}>
            <motion.div
              onClick={() => nav(c.to)}
              whileHover={{ y: -5, boxShadow: `0 16px 44px ${c.accent}20` }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                width: 250, padding: '28px 26px 22px', borderRadius: 16,
                background: '#fff', border: `1px solid #e2e8f0`, cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accent + '50'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
              <motion.div
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
                style={{
                  width: 44, height: 44, borderRadius: 12, background: c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16,
                }}
              >{c.emoji}</motion.div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{c.title}</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          position: 'fixed', bottom: 28, color: '#94a3b8', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#34d399' }}
        />
        Powered by qwen3.6-flash &middot; DashScope
      </motion.p>
    </div>
  );
}
