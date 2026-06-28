import { motion } from 'framer-motion';

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 15px rgba(124,58,237,0.35)',
  },
  secondary: {
    background: 'rgba(124,58,237,0.15)',
    color: '#8b5cf6',
    border: '1px solid rgba(124,58,237,0.3)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: '#a1a1aa',
    border: 'none',
    boxShadow: 'none',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.3)',
    boxShadow: 'none',
  },
  outline: {
    background: 'transparent',
    color: '#fafafa',
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: 'none',
  },
};

const hoverStyles = {
  primary: { boxShadow: '0 6px 20px rgba(124,58,237,0.5)' },
  secondary: { background: 'rgba(124,58,237,0.25)' },
  ghost: { background: 'rgba(255,255,255,0.07)', color: '#fafafa' },
  danger: { background: 'rgba(239,68,68,0.25)' },
  outline: { background: 'rgba(255,255,255,0.07)' },
};

const sizeStyles = {
  sm: { padding: '6px 14px', fontSize: '13px', height: '32px', borderRadius: '8px', gap: '6px' },
  md: { padding: '10px 20px', fontSize: '14px', height: '40px', borderRadius: '10px', gap: '8px' },
  lg: { padding: '14px 28px', fontSize: '16px', height: '48px', borderRadius: '12px', gap: '10px' },
};

function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'btn-spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes btn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  style: extraStyle,
  ...props
}) {
  const isDisabled = disabled || loading;
  const vs = variantStyles[variant] || variantStyles.primary;
  const ss = sizeStyles[size] || sizeStyles.md;

  const baseStyle = {
    ...vs,
    ...ss,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'background 0.2s, box-shadow 0.2s, color 0.2s, border-color 0.2s',
    width: fullWidth ? '100%' : 'auto',
    userSelect: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
    textDecoration: 'none',
    ...extraStyle,
  };

  return (
    <motion.button
      whileHover={!isDisabled && variant === 'primary' ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      style={baseStyle}
      disabled={isDisabled}
      className={className}
      onMouseEnter={e => {
        if (!isDisabled) Object.assign(e.currentTarget.style, hoverStyles[variant] || {});
      }}
      onMouseLeave={e => {
        if (!isDisabled) {
          const orig = variantStyles[variant] || {};
          Object.assign(e.currentTarget.style, {
            background: orig.background || 'transparent',
            boxShadow: orig.boxShadow || 'none',
            color: orig.color || '#fafafa',
          });
        }
      }}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
