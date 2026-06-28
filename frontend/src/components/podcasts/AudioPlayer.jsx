import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiPause, FiX, FiVolume2, FiVolumeX, FiSkipBack, FiSkipForward } from 'react-icons/fi';

export default function AudioPlayer({ podcast, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (podcast?.audio_url && audioRef.current) {
      audioRef.current.play().catch(e => console.error('Error playing audio:', e));
      setIsPlaying(true);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [podcast]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (progressBarRef.current && audioRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = pos * duration;
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (vol === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (amount) => {
    if (audioRef.current) {
      audioRef.current.currentTime += amount;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!podcast) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <audio 
          ref={audioRef} 
          src={podcast.audio_url} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Progress Bar Top */}
        <div 
          ref={progressBarRef}
          className="h-1.5 w-full bg-white/10 cursor-pointer group relative"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] relative"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-[0_0_10px_rgba(124,58,237,0.8)]" />
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          
          {/* Track Info */}
          <div className="flex items-center w-1/3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7c3aed]/20 to-[#3b82f6]/20 flex items-center justify-center border border-white/10 mr-4 flex-shrink-0">
              <div className="flex space-x-0.5 h-4 items-center">
                {[1, 2, 3].map((i) => (
                  <motion.div 
                    key={i}
                    className="w-1 bg-[#8b5cf6] rounded-full"
                    animate={{ height: isPlaying ? [4, 16, 4] : 4 }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
            <div className="truncate pr-4">
              <h4 className="text-white font-medium text-sm truncate">{podcast.title}</h4>
              <p className="text-xs text-gray-400 truncate">{podcast.notes?.title || 'EduPodcast'}</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="flex items-center space-x-6">
              <button onClick={() => skip(-15)} className="text-gray-400 hover:text-white transition-colors" title="Skip back 15s">
                <FiSkipBack size={20} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                {isPlaying ? <FiPause size={22} className="text-[#09090b]" /> : <FiPlay size={22} className="text-[#09090b] ml-1" />}
              </button>
              
              <button onClick={() => skip(15)} className="text-gray-400 hover:text-white transition-colors" title="Skip forward 15s">
                <FiSkipForward size={20} />
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 flex items-center space-x-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Volume & Close */}
          <div className="flex items-center justify-end w-1/3 space-x-4">
            <div className="flex items-center space-x-2 group">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted || volume === 0 ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer"
              />
            </div>
            
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
          
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
