import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiRefreshCcw } from 'react-icons/fi';
import Badge from '../ui/Badge';

export default function FlashcardItem({ flashcard, onCorrect, onIncorrect }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getDifficultyColor = (diff) => {
    switch(diff) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[400px] perspective-1000">
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        onClick={handleFlip}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Front side (Question) */}
        <div className="absolute inset-0 backface-hidden glass-card bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl">
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <Badge variant="purple">{flashcard.category || 'Concept'}</Badge>
            <Badge variant={getDifficultyColor(flashcard.difficulty)}>{flashcard.difficulty || 'Medium'}</Badge>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-medium text-white text-center leading-relaxed">
            {flashcard.question}
          </h3>
          
          <div className="absolute bottom-6 flex items-center text-gray-500 text-sm">
            <FiRefreshCcw className="mr-2" />
            Click to reveal answer
          </div>
        </div>

        {/* Back side (Answer) */}
        <div className="absolute inset-0 backface-hidden glass-card border border-[#7c3aed]/50 bg-gradient-to-br from-[#18181f] to-[#09090b] rounded-2xl p-8 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.15)] rotate-y-180">
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col justify-center">
              <div className="text-lg md:text-xl text-white text-center mb-6">
                {flashcard.answer}
              </div>
              
              {flashcard.explanation && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/5 text-sm text-gray-300 text-left">
                  <span className="font-semibold text-[#8b5cf6] block mb-1">Explanation:</span>
                  {flashcard.explanation}
                </div>
              )}
            </div>
            
            {/* Action buttons - don't trigger flip when clicked */}
            <div className="pt-6 mt-4 border-t border-white/10 flex justify-center space-x-6">
              <button 
                onClick={(e) => { e.stopPropagation(); onIncorrect(flashcard); setIsFlipped(false); }}
                className="flex flex-col items-center group"
              >
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                  <FiX size={24} />
                </div>
                <span className="text-xs text-gray-400 mt-2 font-medium group-hover:text-white transition-colors">Needs Review</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onCorrect(flashcard); setIsFlipped(false); }}
                className="flex flex-col items-center group"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(34,197,94,0)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                  <FiCheck size={24} />
                </div>
                <span className="text-xs text-gray-400 mt-2 font-medium group-hover:text-white transition-colors">Got It</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
