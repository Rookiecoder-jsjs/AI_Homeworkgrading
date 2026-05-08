import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

// ── Shared easings ───────────────────────────────────────
const smooth = [0.16, 1, 0.3, 1]; // cubic-bezier smooth decel
const springSnap = { type: 'spring' as const, stiffness: 300, damping: 30 };
const springSmooth = { type: 'spring' as const, stiffness: 150, damping: 20 };

// ── FadeIn ───────────────────────────────────────────────
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: smooth }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── ScaleIn ──────────────────────────────────────────────
export function ScaleIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: smooth }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger container / item ─────────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: smooth } },
};

export function StaggerContainer({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" style={style}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children }: { children: ReactNode }) {
  return <motion.div variants={staggerItem}>{children}</motion.div>;
}

// ── Hover scale ──────────────────────────────────────────
export function HoverScale({ children, scale = 1.02 }: { children: ReactNode; scale?: number }) {
  return (
    <motion.div whileHover={{ scale }} transition={springSmooth} style={{ display: 'inherit' }}>
      {children}
    </motion.div>
  );
}

// ── Hover lift (card-like) ───────────────────────────────
export function HoverLift({ children }: { children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={springSmooth}
      style={{ display: 'inherit' }}
    >
      {children}
    </motion.div>
  );
}

// ── Page transition wrapper ──────────────────────────────
export function PageTransition({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: smooth }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Button press feedback ────────────────────────────────
export function Pressable({ children, style, onClick, disabled }: {
  children: ReactNode; style?: React.CSSProperties; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springSnap}
      style={{ border: 'none', background: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer', ...style }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// ── Magnetic button (subtle cursor follow) ───────────────
export function Magnetic({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={springSnap}
      style={{ display: 'inline-block', ...style }}
    >
      {children}
    </motion.div>
  );
}
