import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUpload, FiSearch, FiFileText, FiPlus, FiX,
  FiTrash2, FiEye, FiClock, FiFile,
} from 'react-icons/fi';
import useNotes from '@/hooks/useNotes';
import toast from 'react-hot-toast';

/* ─── Status badge ────────────────────────── */
const STATUS = {
  completed:  { bg: '#ECFDF5', color: '#065F46', dot: '#10B981', label: 'Processed' },
  processing: { bg: '#EFF6FF', color: '#1E40AF', dot: '#3B82F6', label: 'Processing' },
  pending:    { bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B', label: 'Pending' },
  failed:     { bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444', label: 'Failed' },
};

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* ─── Upload Modal ────────────────────────── */
function UploadModal({ onClose, onUpload }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile]  = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const ACCEPT = '.pdf,.docx,.txt,.pptx';
  const MAX_MB = 50;

  const pick = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','txt','pptx'].includes(ext)) { setError('Unsupported file type.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File too large (max ${MAX_MB} MB).`); return; }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    pick(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) { setError('Please select a file.'); return; }
    if (!title.trim()) { setError('Please enter a title.'); return; }
    setUploading(true);
    setError('');
    try {
      await onUpload(file, title.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>Upload Note</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <FiX size={16} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('note-file-input').click()}
            className="rounded-xl cursor-pointer transition-all text-center py-8 px-4"
            style={{
              border: `2px dashed ${drag ? '#2563EB' : '#E2E8F0'}`,
              background: drag ? '#EFF6FF' : '#F8FAFC',
            }}>
            <input id="note-file-input" type="file" accept={ACCEPT} className="hidden"
              onChange={e => pick(e.target.files[0])} />
            {file ? (
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: '#ECFDF5', color: '#059669' }}>
                  <FiFile size={20} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{file.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{fmtSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <FiUpload size={20} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Click or drag file here</p>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PDF, DOCX, TXT, PPTX · max {MAX_MB} MB</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Note title…"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ border: '1px solid #E2E8F0', color: '#0F172A' }} />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg"
              style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-gray-50"
            style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={uploading || !file}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
            {uploading
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Uploading…
                </span>
              : 'Upload Note'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Note Card ───────────────────────────── */
function NoteCard({ note, onView, onDelete }) {
  const s   = STATUS[note.processing_status] || STATUS.pending;
  const ext = (note.file_type || 'txt').toUpperCase();

  const EXT_COLORS = {
    PDF:  { bg: '#FEF2F2', color: '#DC2626' },
    DOCX: { bg: '#EFF6FF', color: '#2563EB' },
    TXT:  { bg: '#F0FDF4', color: '#16A34A' },
    PPTX: { bg: '#FFF7ED', color: '#EA580C' },
  };
  const ec = EXT_COLORS[ext] || EXT_COLORS.TXT;

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}
      className="rounded-2xl overflow-hidden transition-all cursor-pointer"
      style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${ec.color},#10B981)` }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
            style={{ background: `${ec.color}20`, color: ec.color, border: `1px solid ${ec.color}40` }}>
            {ext}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: `${s.dot}20`, color: s.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            {s.label}
          </span>
        </div>

        <h3 className="font-bold text-sm leading-snug mb-1 line-clamp-2" style={{ color: '#F1F5F9' }}>
          {note.title}
        </h3>
        {note.course_name && (
          <p className="text-xs mb-2" style={{ color: '#475569' }}>{note.course_name}</p>
        )}

        <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
          <span className="flex items-center gap-1"><FiClock size={11} />{fmtDate(note.created_at)}</span>
          <span className="flex items-center gap-1"><FiFile size={11} />{fmtSize(note.file_size)}</span>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <button onClick={() => onView(note)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366F1,#10B981)', color: '#fff' }}>
          <FiEye size={13} /> View & Generate
        </button>
        <button onClick={() => onDelete(note)}
          className="p-2 rounded-xl transition-all"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>
          <FiTrash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ───────────────────────────── */
export default function NotesPage() {
  const navigate = useNavigate();
  const { notes, loading, fetchNotes, deleteNote, uploadNote } = useNotes();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => { fetchNotes(); }, []);

  const handleDelete = async (note) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    await deleteNote(note.id);
  };

  const handleUpload = async (file, title) => {
    const { data, error } = await uploadNote(file, { title });
    if (error) throw error;
    await fetchNotes();
    if (data?.id) navigate(`/notes/${data.id}`, { state: { noteId: data.id } });
  };

  const visible = notes.filter(n => {
    if (filter !== 'all' && n.processing_status !== filter) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100%' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">My Notes</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {notes.length} document{notes.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            <FiPlus size={16} /> Upload Note
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: '#64748B' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'completed', 'processing', 'failed'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
                style={filter === f
                  ? { background: '#2563EB', color: '#fff' }
                  : { background: '#1E293B', color: '#64748B', border: '1px solid rgba(255,255,255,0.08)' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl h-44 animate-pulse" style={{ background: '#1E293B' }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(37,99,235,0.15)', color: '#2563EB' }}>
              <FiFileText size={28} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">
              {search || filter !== 'all' ? 'No notes match' : 'No notes yet'}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#64748B' }}>
              {search || filter !== 'all'
                ? 'Try different search terms or filters'
                : 'Upload your first PDF, DOCX, TXT or PPTX document'}
            </p>
            {!search && filter === 'all' && (
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                <FiUpload size={15} /> Upload First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visible.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onView={n => {
                  if (!n?.id) { toast.error('This note has no ID — please refresh My Notes'); return; }
                  navigate(`/notes/${n.id}`, { state: { noteId: n.id } });
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUpload={handleUpload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
