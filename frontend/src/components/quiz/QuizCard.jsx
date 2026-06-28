import React from 'react';
import { FiCheckSquare, FiClock, FiTarget, FiArrowRight } from 'react-icons/fi';
import { format } from 'date-fns';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function QuizCard({ quiz, onStart, onViewResults }) {
  const hasAttempts = quiz.attempts_count > 0;
  const bestScore = quiz.best_score || 0;
  
  // Calculate SVG circle progress
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (bestScore / 100) * circumference;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#22c55e]';
    if (score >= 60) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const getScoreStroke = (score) => {
    if (score >= 80) return 'stroke-[#22c55e]';
    if (score >= 60) return 'stroke-[#f59e0b]';
    return 'stroke-[#ef4444]';
  };

  return (
    <Card className="flex flex-col h-full relative overflow-hidden">
      {/* Top right decorative gradient blob */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#22c55e]/10 blur-3xl rounded-full" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <Badge variant={hasAttempts ? "success" : "default"}>
          {hasAttempts ? 'Attempted' : 'New Quiz'}
        </Badge>
        
        {hasAttempts && (
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-white/10"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`${getScoreStroke(bestScore)} transition-all duration-1000 ease-out`}
              />
            </svg>
            <span className={`absolute text-[10px] font-bold ${getScoreColor(bestScore)}`}>
              {bestScore}%
            </span>
          </div>
        )}
      </div>
      
      <div className="mb-4 flex-1 relative z-10">
        <h3 className="text-lg font-medium text-white mb-2 line-clamp-2">{quiz.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-4">
          Test your knowledge from: {quiz.notes?.title || 'General Notes'}
        </p>
        
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          <div className="flex items-center bg-white/5 px-2 py-1 rounded-md">
            <FiCheckSquare className="mr-1.5 text-[#22c55e]" />
            {quiz.total_questions} Questions
          </div>
          <div className="flex items-center bg-white/5 px-2 py-1 rounded-md">
            <FiClock className="mr-1.5 text-[#3b82f6]" />
            {quiz.time_limit ? `${quiz.time_limit} mins` : 'No limit'}
          </div>
          <div className="flex items-center bg-white/5 px-2 py-1 rounded-md">
            <FiTarget className="mr-1.5 text-[#f59e0b]" />
            {quiz.passing_score}% to pass
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto relative z-10">
        <span className="text-[10px] text-gray-500">
          {format(new Date(quiz.created_at), 'MMM d, yyyy')}
        </span>
        
        <div className="flex space-x-2">
          {hasAttempts && (
            <Button variant="ghost" size="sm" onClick={() => onViewResults(quiz)}>
              Results
            </Button>
          )}
          <Button 
            variant={hasAttempts ? "secondary" : "primary"}
            size="sm" 
            onClick={() => onStart(quiz)}
            icon={<FiArrowRight />}
            className="flex-row-reverse space-x-reverse"
          >
            {hasAttempts ? 'Retake' : 'Start Quiz'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
