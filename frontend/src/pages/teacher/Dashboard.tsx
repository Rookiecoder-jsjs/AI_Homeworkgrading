import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { StaggerContainer, StaggerItem } from '../../motion';
import type { TeacherDashboard } from '../../types';

const smooth = [0.16, 1, 0.3, 1];

export default function TeacherDashboardPage() {
  const nav = useNavigate();
  const [data, setData] = useState<TeacherDashboard | null>(null);

  useEffect(() => {
    api.getTeacherDashboard().then(setData).catch(console.error);
  }, []);

  const cards = [
    { label: '作业总数', value: data?.total_assignments ?? '—', color: '#4338ca', bg: '#eef2ff', to: '/teacher/assignments' },
    { label: '提交总数', value: data?.total_submissions ?? '—', color: '#7c3aed', bg: '#f5f3ff', to: '/teacher/assignments' },
    { label: '已批改',   value: data?.graded_count ?? '—',       color: '#047857', bg: '#ecfdf5', to: '/teacher/assignments' },
    { label: '待复核',   value: data?.pending_review_count ?? '—', color: '#b45309', bg: '#fffbeb', to: '/teacher/review-queue' },
    { label: '平均分',   value: data?.average_score ?? '—',      color: '#0369a1', bg: '#f0f9ff', to: '/teacher/assignments' },
  ];

  return (
    <div style={{ padding: '28px 24px', maxWidth: 920, margin: '0 auto', fontFamily: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smooth }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>教师看板</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0' }}>概览所有班级的作业情况</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/teacher/assignments')}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: '#4338ca', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            作业管理
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/')}
            style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            返回首页
          </motion.button>
        </div>
      </motion.div>

      <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <motion.div
              onClick={() => nav(c.to)}
              whileHover={{ y: -3, boxShadow: `0 12px 32px ${c.color}18` }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '22px 20px', borderRadius: 16, background: '#fff',
                border: '1px solid #e2e8f0', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.color + '50'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, marginBottom: 14,
              }}>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }}
                />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ marginTop: 12, fontSize: 11, color: c.color, opacity: 0.5 }}>查看详情 →</div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45, ease: smooth }}
        style={{ marginTop: 36, textAlign: 'center' }}
      >
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 6px 24px rgba(67,56,202,0.35)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => nav('/teacher/assignments/new')}
          style={{
            padding: '12px 36px', borderRadius: 14, border: 'none',
            background: '#4338ca', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(67,56,202,0.25)',
          }}
        >
          + 创建新作业
        </motion.button>
      </motion.div>
    </div>
  );
}
