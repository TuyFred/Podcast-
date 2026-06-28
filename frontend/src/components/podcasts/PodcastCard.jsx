import React from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiDownload, FiTrash2, FiClock, FiHeadphones } from 'react-icons/fi';
import { format } from 'date-fns';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function PodcastCard({ podcast, onPlay, onDelete }) {
  
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Ready</Badge>;
      case 'audio_processing': return <Badge variant="info">Synthesizing...</Badge>;
      case 'script_generated': return <Badge variant="warning">Script Ready</Badge>;
      case 'failed': return <Badge variant="error">Failed</Badge>;
      default: return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <Card className="flex flex-col h-full group">
      <div className="flex justify-between items-start mb-4">
        <div>
          {getStatusBadge(podcast.generation_status)}
        </div>
        <button 
          onClick={() => onDelete(podcast)}
          className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-1 line-clamp-2">{podcast.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-1">From: {podcast.notes?.title || 'Unknown Note'}</p>
      </div>
      
      {/* Decorative Waveform */}
      <div className="h-12 w-full flex items-center justify-between space-x-1 mb-6 opacity-30 group-hover:opacity-60 transition-opacity">
        {[...Array(20)].map((_, i) => (
          <motion.div 
            key={i}
            className="w-full bg-gradient-to-t from-[#7c3aed] to-[#3b82f6] rounded-full"
            initial={{ height: '20%' }}
            animate={{ 
              height: podcast.generation_status === 'completed' 
                ? ['20%', `${Math.random() * 80 + 20}%`, '20%'] 
                : '10%'
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5, 
              delay: i * 0.05,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center"><FiClock className="mr-1" /> {formatDuration(podcast.duration)}</span>
          <span className="flex items-center"><FiHeadphones className="mr-1" /> {podcast.stream_count || 0}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {podcast.generation_status === 'completed' && (
            <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors">
              <a href={podcast.audio_url} download target="_blank" rel="noopener noreferrer">
                <FiDownload size={14} />
              </a>
            </button>
          )}
          
          <button 
            onClick={() => onPlay(podcast)}
            disabled={podcast.generation_status !== 'completed'}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all
              ${podcast.generation_status === 'completed' 
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:scale-105 shadow-[0_0_15px_rgba(124,58,237,0.4)]' 
                : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}
          >
            <FiPlay size={16} className="ml-1" />
          </button>
        </div>
      </div>
    </Card>
  );
}
