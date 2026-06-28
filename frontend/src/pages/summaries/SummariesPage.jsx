import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen } from 'react-icons/fi';
import useSummaries from '@/hooks/useSummaries';
import SummaryCard from '@/components/summaries/SummaryCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SummariesPage() {
  const navigate = useNavigate();
  const { summaries, loading, fetchSummaries } = useSummaries();
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const filteredSummaries = summaries.filter(summary => {
    if (typeFilter === 'all') return true;
    return summary.summary_type === typeFilter;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Summaries</h1>
          <p className="text-gray-400">Quickly review the most important points from your notes.</p>
        </div>
      </div>

      <div className="flex space-x-2 w-full overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'All Types' },
          { id: 'comprehensive', label: 'Comprehensive' },
          { id: 'medium', label: 'Standard' },
          { id: 'exam_revision', label: 'Exam Prep' },
          { id: 'one_minute', label: '1-Min Quick' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setTypeFilter(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              typeFilter === filter.id 
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Loading summaries..." />
          </div>
        ) : filteredSummaries.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            {filteredSummaries.map(summary => (
              <SummaryCard key={summary.id} summary={summary} />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center mt-12">
            <EmptyState 
              icon={<FiBookOpen />}
              title="No summaries found"
              description="You haven't generated any summaries yet. Go to a note to generate one."
              action={{ label: "Go to Notes", onClick: () => navigate('/notes') }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
