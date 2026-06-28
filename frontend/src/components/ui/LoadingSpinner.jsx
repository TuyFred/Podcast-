import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'md', text, fullScreen = false }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <motion.div
        className={`rounded-full border-t-[#7c3aed] border-r-transparent border-b-transparent border-l-transparent ${sizeClasses[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {text && <p className="text-[#a1a1aa] text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}
