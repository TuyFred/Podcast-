import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckSquare } from 'react-icons/fi';
import useQuizzes from '@/hooks/useQuizzes';
import QuizCard from '@/components/quiz/QuizCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function QuizzesPage() {
  const navigate = useNavigate();
  const { quizzes, loading, fetchQuizzes } = useQuizzes();

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleStart = (quiz) => {
    navigate(`/quizzes/${quiz.id}/play`);
  };

  const handleViewResults = (quiz) => {
    // Navigate to results or open modal (simplifying to just start for now)
    navigate(`/quizzes/${quiz.id}/play`);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">My Quizzes</h1>
          <p className="text-gray-400">Test your knowledge with AI-generated quizzes.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Loading quizzes..." />
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {quizzes.map(quiz => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                onStart={handleStart}
                onViewResults={handleViewResults}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center mt-12">
            <EmptyState 
              icon={<FiCheckSquare />}
              title="No quizzes found"
              description="You haven't generated any quizzes yet. Go to a note to generate one."
              action={{ label: "Go to Notes", onClick: () => navigate('/notes') }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
