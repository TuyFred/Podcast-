import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

// useNotes hook mock if not available
const useNotesFallback = () => ({
  uploadNote: async (file, metadata) => { console.log('Upload:', file, metadata); },
  isUploading: false,
  uploadError: null,
});

let useNotes;
try {
  useNotes = require('@/hooks/useNotes').useNotes;
} catch {
  useNotes = useNotesFallback;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const fileTypeInfo = {
  'application/pdf': { label: 'PDF', variant: 'info' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', variant: 'purple' },
  'text/plain': { label: 'TXT', variant: 'default' },
};

export default function NoteUpload() {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', courseName: '', subjectArea: '', difficultyLevel: 'beginner' });
  const [errors, setErrors] = useState({});
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { uploadNote, isUploading, uploadError } = useNotes();

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      setErrors({ file: err.code === 'file-too-large' ? 'File exceeds 50MB limit' : err.message });
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setErrors(prev => ({ ...prev, file: null }));
      // Auto-fill title from filename
      const name = acceptedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormData(prev => ({ ...prev, title: prev.title || name }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 52428800,
    multiple: false,
  });

  const validate = () => {
    const e = {};
    if (!file) e.file = 'Please select a file';
    if (!formData.title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await uploadNote(file, formData);
    if (!uploadError) setUploadSuccess(true);
  };

  const inputStyle = {
    background: '#18181f', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#fafafa', padding: '10px 12px',
    width: '100%', outline: 'none', fontSize: '14px',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  if (uploadSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px', textAlign: 'center' }}
      >
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiCheckCircle size={32} color="#22c55e" />
        </div>
        <h3 style={{ color: '#fafafa', fontSize: '20px', fontWeight: '600', fontFamily: 'Inter', margin: 0 }}>Note uploaded!</h3>
        <p style={{ color: '#a1a1aa', fontSize: '14px', fontFamily: 'Inter', margin: 0 }}>Your note is being processed and will be ready shortly.</p>
        <Button variant="secondary" onClick={() => { setFile(null); setFormData({ title: '', description: '', courseName: '', subjectArea: '', difficultyLevel: 'beginner' }); setUploadSuccess(false); }}>Upload another</Button>
      </motion.div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#7c3aed' : errors.file ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '12px', padding: '48px 24px',
          background: isDragActive ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.02)',
          boxShadow: isDragActive ? '0 0 20px rgba(124,58,237,0.2)' : 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
        }}
      >
        <input {...getInputProps()} />
        <FiUploadCloud size={48} style={{ color: isDragActive ? '#7c3aed' : '#52525b', transition: 'color 0.2s' }} />
        <div>
          <p style={{ color: '#fafafa', fontSize: '16px', fontWeight: '600', fontFamily: 'Inter', margin: '0 0 4px' }}>
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p style={{ color: '#52525b', fontSize: '13px', fontFamily: 'Inter', margin: 0 }}>PDF, DOCX, TXT up to 50MB</p>
        </div>
        <Button variant="outline" size="sm" onClick={e => e.stopPropagation()}>Browse files</Button>
      </div>
      {errors.file && <p style={{ color: '#ef4444', fontSize: '12px', fontFamily: 'Inter', margin: '-16px 0 0' }}>{errors.file}</p>}

      {/* Selected file */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '10px' }}
          >
            <FiFile size={20} style={{ color: '#8b5cf6', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fafafa', fontSize: '14px', fontFamily: 'Inter', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={(fileTypeInfo[file.type] || {}).variant || 'default'}>{(fileTypeInfo[file.type] || {}).label || 'File'}</Badge>
                <span style={{ color: '#52525b', fontSize: '12px', fontFamily: 'Inter' }}>{formatBytes(file.size)}</span>
              </div>
            </div>
            <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
              <FiX size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metadata form */}
      {file && (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {uploadError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 14px', color: '#ef4444', fontSize: '14px', fontFamily: 'Inter' }}>
              <FiAlertCircle size={16} />{uploadError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', fontFamily: 'Inter', marginBottom: '6px', fontWeight: '500' }}>
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Chapter 3 Notes" style={{ ...inputStyle, borderColor: errors.title ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
            />
            {errors.title && <p style={{ color: '#ef4444', fontSize: '12px', fontFamily: 'Inter', margin: '4px 0 0' }}>{errors.title}</p>}
          </div>

          <div>
            <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', fontFamily: 'Inter', marginBottom: '6px', fontWeight: '500' }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description..." rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', fontFamily: 'Inter', marginBottom: '6px', fontWeight: '500' }}>Course Name</label>
              <input type="text" value={formData.courseName} onChange={e => setFormData(p => ({ ...p, courseName: e.target.value }))}
                placeholder="e.g., Biology 101" style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', fontFamily: 'Inter', marginBottom: '6px', fontWeight: '500' }}>Subject Area</label>
              <input type="text" value={formData.subjectArea} onChange={e => setFormData(p => ({ ...p, subjectArea: e.target.value }))}
                placeholder="e.g., Life Sciences" style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', fontFamily: 'Inter', marginBottom: '6px', fontWeight: '500' }}>Difficulty Level</label>
            <select value={formData.difficultyLevel} onChange={e => setFormData(p => ({ ...p, difficultyLevel: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={isUploading} icon={<FiUploadCloud size={16} />}>Upload Note</Button>
        </motion.form>
      )}
    </div>
  );
}
