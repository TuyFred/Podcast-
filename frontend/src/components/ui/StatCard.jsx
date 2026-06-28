import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Card from './Card';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

export default function StatCard({ title, value, icon, change, color = 'purple' }) {
  const [displayValue, setDisplayValue] = useState(typeof value === 'number' ? 0 : value);
  const controls = useAnimation();
  
  const colors = {
    purple: { bg: 'bg-[#7c3aed]/20', text: 'text-[#8b5cf6]' },
    blue: { bg: 'bg-[#3b82f6]/20', text: 'text-[#60a5fa]' },
    green: { bg: 'bg-[#22c55e]/20', text: 'text-[#4ade80]' },
    yellow: { bg: 'bg-[#f59e0b]/20', text: 'text-[#fbbf24]' },
  };
  
  const selectedColor = colors[color] || colors.purple;

  // Simple count up animation effect for numbers
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      if (start === end) {
        setDisplayValue(end);
        return;
      }
      
      const duration = 1000;
      const increment = (end - start) / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          clearInterval(timer);
          setDisplayValue(end);
        } else {
          setDisplayValue(Math.ceil(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <Card className="flex items-center p-6 h-full" glow={false}>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-[#a1a1aa] mb-2">{title}</h4>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-bold text-white">{displayValue}</span>
          
          {change !== undefined && (
            <span className={`flex items-center text-sm font-medium ${change >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {change >= 0 ? <FiArrowUp className="mr-1" /> : <FiArrowDown className="mr-1" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
      
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedColor.bg} ${selectedColor.text} text-2xl ml-4`}>
        {icon}
      </div>
    </Card>
  );
}
