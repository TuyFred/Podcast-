import React from 'react';
import { motion } from 'framer-motion';
import { FiEye, FiTrash2, FiFileText, FiFile, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function NoteCard({ note, onDelete, onView }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Ready</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing...</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  };

  const getFileIcon = (type) => {
    return <FiFileText className="text-[#8b5cf6]" size={24} />;
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center">
            {getFileIcon(note.file_type)}
          </div>
          <div>
            <h3 className="text-white font-medium line-clamp-1" title={note.title}>
              {note.title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {note.course_name || 'General Notes'}
            </p>
          </div>
        </div>
        <div>
          {getStatusBadge(note.processing_status)}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
          <div className="flex items-center">
            <FiFile className="mr-1.5 text-[#52525b]" />
            {formatFileSize(note.file_size)}
          </div>
          <div className="flex items-center">
            <FiClock className="mr-1.5 text-[#52525b]" />
            {format(new Date(note.created_at), 'MMM d, yyyy')}
          </div>
        </div>
        
        {note.main_topics && note.main_topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {note.main_topics.slice(0, 3).map((topic, i) => (
              <span key={i} className="text-[10px] bg-white/5 text-gray-300 px-2 py-0.5 rounded-full border border-white/5">
                {topic}
              </span>
            ))}
            {note.main_topics.length > 3 && (
              <span className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-full">
                +{note.main_topics.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onView(note)}
          icon={<FiEye />}
          className="text-gray-300"
        >
          View Details
        </Button>
        <button 
          onClick={() => onDelete(note)}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Delete note"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </Card>
  );
}
