import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiFileText, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { format } from 'date-fns';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function SummaryCard({ summary }) {
  const [expanded, setExpanded] = useState(false);

  const getTypeConfig = (type) => {
    switch(type) {
      case 'comprehensive': 
        return { label: 'Comprehensive', variant: 'purple', bg: 'bg-[#7c3aed]/10', border: 'border-[#7c3aed]/20' };
      case 'medium': 
        return { label: 'Standard', variant: 'info', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20' };
      case 'exam_revision': 
        return { label: 'Exam Prep', variant: 'warning', bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/20' };
      case 'one_minute': 
        return { label: '1-Min Quick', variant: 'success', bg: 'bg-[#22c55e]/10', border: 'border-[#22c55e]/20' };
      default: 
        return { label: 'Summary', variant: 'default', bg: 'bg-white/5', border: 'border-white/10' };
    }
  };

  const config = getTypeConfig(summary.summary_type);

  const handleExport = () => {
    // Generate text file
    const text = `${summary.notes?.title || 'Summary'} - ${config.label}\n\n${summary.content}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Summary_${summary.summary_type}_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="flex flex-col relative overflow-hidden transition-all duration-300">
      <div className={`absolute top-0 left-0 w-1 h-full ${config.bg.replace('/10', '')}`} />
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <Badge variant={config.variant} className="mb-2">
            {config.label}
          </Badge>
          <h3 className="text-lg font-medium text-white line-clamp-1">
            {summary.notes?.title || 'Summary Document'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Generated {format(new Date(summary.created_at || new Date()), 'MMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex space-x-2 text-xs text-gray-400">
          <span className="flex items-center bg-[#18181f] px-2 py-1 rounded border border-white/5">
            <FiFileText className="mr-1.5" />
            {summary.word_count || 0} words
          </span>
          <span className="flex items-center bg-[#18181f] px-2 py-1 rounded border border-white/5">
            <FiClock className="mr-1.5" />
            {summary.reading_time || Math.ceil((summary.word_count || 0) / 200)} min
          </span>
        </div>
      </div>
      
      <div className={`text-sm text-gray-300 leading-relaxed ${!expanded && 'line-clamp-3 mb-4'} whitespace-pre-wrap`}>
        {summary.content}
      </div>
      
      <AnimatePresence>
        {expanded && summary.key_points && summary.key_points.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-4 border-t border-white/10"
          >
            <h4 className="text-white font-medium mb-3 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] mr-2" />
              Key Points
            </h4>
            <ul className="space-y-2">
              {summary.key_points.map((point, i) => (
                <li key={i} className="text-sm text-gray-400 pl-4 relative">
                  <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-gray-500" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className={`flex items-center justify-between mt-auto pt-4 ${expanded ? 'border-t border-white/10 mt-6' : ''}`}>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-[#8b5cf6] hover:text-[#7c3aed] flex items-center font-medium transition-colors"
        >
          {expanded ? (
            <><FiChevronUp className="mr-1" /> Show Less</>
          ) : (
            <><FiChevronDown className="mr-1" /> Read Full Summary</>
          )}
        </button>
        
        <Button 
          variant="outline" 
          size="sm" 
          icon={<FiDownload />}
          onClick={handleExport}
        >
          Export
        </Button>
      </div>
    </Card>
  );
}
