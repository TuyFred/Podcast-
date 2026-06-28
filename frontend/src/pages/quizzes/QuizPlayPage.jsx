import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiCheck, FiX, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import useQuizzes from '@/hooks/useQuizzes';

export default function QuizPlayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getQuizResults, submitQuiz } = useQuizzes();
  
  // Mock data since we can't fetch real questions easily without backend
  const [quiz, setQuiz] = useState({
    id: id,
    title: 'Sample Quiz',
    total_questions: 3,
    passing_score: 70,
    questions: [
      { id: 1, text: 'What is the main advantage of spaced repetition?', options: [{ id: 'A', text: 'It looks cool' }, { id: 'B', text: 'Improves long-term retention' }, { id: 'C', text: 'It is faster' }, { id: 'D', text: 'None of the above' }], correctOption: 'B' },
      { id: 2, text: 'Which format is NOT supported for note uploads?', options: [{ id: 'A', text: 'PDF' }, { id: 'B', text: 'DOCX' }, { id: 'C', text: 'TXT' }, { id: 'D', text: 'MP4' }], correctOption: 'D' },
      { id: 3, text: 'What powers the AI in EduPodcast?', options: [{ id: 'A', text: 'OpenAI / Gemini' }, { id: 'B', text: 'Magic' }, { id: 'C', text: 'Manual labor' }, { id: 'D', text: 'Basic scripts' }], correctOption: 'A' }
    ]
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isFinished) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isFinished]);

  const handleSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    setAnswers({ ...answers, [quiz.questions[currentQuestionIndex].id]: selectedOption });
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsFinished(true);
    
    const finalAnswers = { ...answers };
    if (selectedOption) {
      finalAnswers[quiz.questions[currentQuestionIndex].id] = selectedOption;
    }
    
    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (finalAnswers[q.id] === q.correctOption) {
        correctCount++;
      }
    });
    
    const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
    setScore(finalScore);
    
    try {
      await submitQuiz(id, finalAnswers, 600 - timeLeft);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    const passed = score >= quiz.passing_score;
    
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="text-center p-12 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
            
            <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
            <p className="text-gray-400 mb-8">{quiz.title}</p>
            
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                  <circle 
                    cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 80}
                    strokeDashoffset={2 * Math.PI * 80 * (1 - score / 100)}
                    className={`${passed ? 'text-green-500' : 'text-red-500'} transition-all duration-1500 ease-out`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-5xl font-bold ${passed ? 'text-green-500' : 'text-red-500'}`}>{score}%</span>
                  <span className={`text-sm font-medium uppercase tracking-widest mt-1 ${passed ? 'text-green-500' : 'text-red-500'}`}>
                    {passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">
                  {Object.keys(answers).filter(k => answers[k] === quiz.questions.find(q => q.id == k).correctOption).length}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Correct</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">
                  {Object.keys(answers).filter(k => answers[k] !== quiz.questions.find(q => q.id == k).correctOption).length}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Incorrect</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{formatTime(600 - timeLeft)}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Time taken</div>
              </div>
            </div>
            
            <div className="flex space-x-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/quizzes')} icon={<FiArrowLeft />}>
                Back to Quizzes
              </Button>
              <Button onClick={() => window.location.reload()} icon={<FiRefreshCw />}>
                Try Again
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#111117]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => navigate('/quizzes')} className="mr-4 text-gray-400 hover:text-white transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-semibold">{quiz.title}</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center text-sm font-medium">
            <span className="text-[#8b5cf6]">Question {currentQuestionIndex + 1}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-gray-400">{quiz.total_questions}</span>
          </div>
          
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-mono ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white'}`}>
            <FiClock className="mr-2" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] transition-all duration-300"
          style={{ width: `${((currentQuestionIndex) / quiz.total_questions) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl"
          >
            <h2 className="text-2xl md:text-3xl font-medium leading-relaxed mb-10 text-center">
              {currentQ.text}
            </h2>
            
            <div className="space-y-4 mb-10">
              {currentQ.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center ${
                    selectedOption === option.id 
                      ? 'bg-[#7c3aed]/20 border-[#8b5cf6] shadow-[0_0_15px_rgba(124,58,237,0.2)]' 
                      : 'bg-[#18181f] border-white/10 hover:border-white/30 hover:bg-[#18181f]/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center font-bold mr-4 transition-colors ${
                    selectedOption === option.id ? 'bg-[#7c3aed] text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    {option.id}
                  </div>
                  <span className={`text-lg ${selectedOption === option.id ? 'text-white' : 'text-gray-300'}`}>
                    {option.text}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={handleNext} 
                disabled={!selectedOption}
                className="w-full md:w-auto px-12"
              >
                {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
