import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import PodcastStudio from '@/components/podcasts/PodcastStudio';

export default function StudioPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-75 transition-opacity"
          style={{ color: '#64748B' }}>
          <FiArrowLeft size={15} /> Back to Notes
        </button>
        <PodcastStudio onFinish={() => navigate('/podcasts')} />
      </div>
    </div>
  );
}
