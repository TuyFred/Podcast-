import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLayers, FiPlay, FiCheckCircle } from 'react-icons/fi';
import useFlashcards from '@/hooks/useFlashcards';
import FlashcardItem from '@/components/flashcards/FlashcardItem';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const { flashcards, loading, fetchFlashcards, reviewFlashcard } = useFlashcards();
  const [activeDeck, setActiveDeck] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  // Group flashcards by note title to create "decks"
  const decks = flashcards.reduce((acc, card) => {
    const noteId = card.notes_id || 'general';
    const noteTitle = card.notes?.title || 'General Concepts';
    
    if (!acc[noteId]) {
      acc[noteId] = { id: noteId, title: noteTitle, cards: [], dueCount: 0 };
    }
    acc[noteId].cards.push(card);
    
    // Simple logic for "due" — based on next_review_date
    const isDue = !card.next_review_date || new Date(card.next_review_date) <= new Date();
    if (isDue) acc[noteId].dueCount++;
    
    return acc;
  }, {});

  const startReview = (deck) => {
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFinished(false);
    setSessionStats({ correct: 0, incorrect: 0 });
  };

  const handleNext = (correct) => {
    // Update stats
    setSessionStats(prev => ({
      ...prev,
      [correct ? 'correct' : 'incorrect']: prev[correct ? 'correct' : 'incorrect'] + 1
    }));
    
    // API call to update review schedule
    const currentCard = activeDeck.cards[currentCardIndex];
    reviewFlashcard(currentCard.id, correct).catch(console.error);

    // Move to next card or finish
    if (currentCardIndex < activeDeck.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (activeDeck && !isFinished) {
    const currentCard = activeDeck.cards[currentCardIndex];
    
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center relative">
        <div className="absolute top-0 left-0 w-full flex justify-between items-center p-4">
          <button 
            onClick={() => setActiveDeck(null)}
            className="text-gray-400 hover:text-white"
          >
            Exit Review
          </button>
          
          <div className="text-sm font-medium text-gray-300">
            {currentCardIndex + 1} / {activeDeck.cards.length}
          </div>
          
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
        
        {/* Progress bar */}
        <div className="absolute top-16 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] transition-all duration-300"
            style={{ width: `${((currentCardIndex) / activeDeck.cards.length) * 100}%` }}
          />
        </div>

        <h2 className="text-xl text-gray-400 mb-8">{activeDeck.title}</h2>
        
        <FlashcardItem 
          key={currentCard.id} // Important to force re-render/animation reset
          flashcard={currentCard}
          onCorrect={() => handleNext(true)}
          onIncorrect={() => handleNext(false)}
        />
      </div>
    );
  }

  if (activeDeck && isFinished) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            <FiCheckCircle />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Review Complete!</h2>
          <p className="text-gray-400 mb-8">You've finished the {activeDeck.title} deck.</p>
          
          <div className="flex justify-center space-x-8 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">{sessionStats.correct}</div>
              <div className="text-xs text-gray-500 uppercase">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-1">{sessionStats.incorrect}</div>
              <div className="text-xs text-gray-500 uppercase">Incorrect</div>
            </div>
          </div>
          
          <Button onClick={() => setActiveDeck(null)}>
            Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Flashcard Decks</h1>
          <p className="text-gray-400">Master concepts using spaced repetition.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Loading flashcards..." />
          </div>
        ) : Object.keys(decks).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {Object.values(decks).map(deck => (
              <div key={deck.id} className="glass-card bg-[#111117]/80 rounded-xl p-6 border border-white/10 hover:border-[#8b5cf6]/50 transition-colors group flex flex-col h-full">
                <div className="w-12 h-12 bg-[#7c3aed]/10 text-[#8b5cf6] rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  <FiLayers />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">{deck.title}</h3>
                <p className="text-gray-400 text-sm mb-6 flex-1">
                  {deck.cards.length} total cards
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="text-sm">
                    <span className="font-bold text-[#f59e0b]">{deck.dueCount}</span>
                    <span className="text-gray-500 ml-1">due for review</span>
                  </div>
                  
                  <Button 
                    onClick={() => startReview(deck)}
                    size="sm"
                    icon={<FiPlay />}
                    variant={deck.dueCount > 0 ? 'primary' : 'secondary'}
                  >
                    Study
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center mt-12">
            <EmptyState 
              icon={<FiLayers />}
              title="No flashcards found"
              description="Generate intelligent flashcards from your notes to start studying."
              action={{ label: "Go to Notes", onClick: () => navigate('/notes') }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
