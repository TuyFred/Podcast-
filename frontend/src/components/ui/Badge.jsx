import React from 'react';

export default function Badge({ variant = 'default', children, className = '' }) {
  const variantStyles = {
    default: 'bg-white/10 text-[#a1a1aa] border-transparent',
    success: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/20',
    warning: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20',
    error: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20',
    info: 'bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/20',
    purple: 'bg-[#7c3aed]/15 text-[#8b5cf6] border-[#7c3aed]/20',
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {children}
    </span>
  );
}
