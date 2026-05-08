export const theme = {
  color: {
    primary: '#4338ca',
    primaryHover: '#3730a3',
    primaryLight: '#818cf8',
    primaryBg: '#eef2ff',
    primaryBorder: '#c7d2fe',
    success: '#047857',
    successLight: '#34d399',
    successBg: '#ecfdf5',
    successBorder: '#a7f3d0',
    warning: '#b45309',
    warningLight: '#fbbf24',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    danger: '#b91c1c',
    dangerBg: '#fef2f2',
    dangerBorder: '#fecaca',
    text: '#1e293b',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 999,
  },
  shadow: {
    xs: '0 1px 2px rgba(0,0,0,0.04)',
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
    lg: '0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
    glow: (c: string) => `0 6px 24px ${c}20`,
  },
  font: {
    stack: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  },
  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// CSS keyframes injected once via index.css
export const animStyles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
` as const;

// Staggered animation delay helper
export const stagger = (index: number, base = 60) => ({
  animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * base}ms both`,
});
