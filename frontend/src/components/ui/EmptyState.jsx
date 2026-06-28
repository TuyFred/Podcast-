import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-[#52525b] text-4xl mb-6 shadow-inner">
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold text-[#fafafa] mb-2">{title}</h3>
      <p className="text-[#a1a1aa] max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      
      {action && (
        <Button 
          variant="secondary" 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
