import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, padding = true, glow = false }) {
  const baseClasses = 'glass-card rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden';
  const paddingClasses = padding ? 'p-6' : '';
  const glowClasses = glow ? 'shadow-[0_0_20px_rgba(124,58,237,0.25)] border-[#8b5cf6]/50' : '';
  const combinedClasses = `${baseClasses} ${paddingClasses} ${glowClasses} ${className}`;

  if (hover) {
    return (
      <motion.div
        className={combinedClasses}
        whileHover={{
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderColor: 'rgba(255,255,255,0.16)'
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={combinedClasses}>{children}</div>;
}
