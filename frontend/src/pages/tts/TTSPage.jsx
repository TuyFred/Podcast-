/**
 * Text-to-Speech Page
 * - Type any text
 * - Upload a file (PDF / DOCX / TXT) → backend extracts text
 * - Import from saved notes
 * - Language selector
 * - Inline audio player (no new tab)
 * - Download MP3 (force download via blob)
 * - Back button to dashboard
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMic, FiPlay, FiPause, FiDownload, FiVolume2, FiVolumeX,
  FiSkipBack, FiSkipForward, FiFileText, FiRefreshCw,
  FiChevronDown, FiUpload, FiArrowLeft, FiX,
} from 'react-icons/fi';
import axios from 'axios';
import useNotes from '@/hooks/useNotes';
import useAuthStore from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'pt', label: '🇵🇹 Portuguese' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'ru', label: '🇷🇺 Russian' },
  { code: 'tr', label: '🇹🇷 Turkish' },
  { code: 'nl', label: '🇳🇱 Dutch' },
];

const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/* ═══════════════════════════════════════
   Inline Audio Player (blob-based)
   ═══════════════════════════════════════ */
function AudioPlayer({ blobUrl, fileName, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume,   setVolume]   = useState(0.85);
  const [muted,    setMuted]    = useState(false);

  // Auto-play when blob arrives
  useEffect(() => {
    if (!blobUrl) return;
    setPlaying(false); setCurrent(0); setDuration(0);
    // slight delay so browser has time to load blob
    setTimeout(() => {
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    }, 200);
  }, [blobUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const handlers = {
      loadedmetadata: () => setDuration(a.duration),
      timeupdate:     () => setCurrent(a.currentTime),
      ended:          () => setPlaying(false),
      pause:          () => setPlaying(false),
      play:           () => setPlaying(true),
    };
    Object.entries(handlers).forEach(([ev, fn]) => a.addEventListener(ev, fn));
    return () => Object.entries(handlers).forEach(([ev, fn]) => a.removeEventListener(ev, fn));
  }, [blobUrl]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) a.pause(); else a.play().catch(() => {});
  };
  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const a    = audioRef.current;
    if (a && duration) { a.currentTime = pct * duration; setCurrent(pct * duration); }
  };
  const skip = (s) => {
    const a = audioRef.current;
    if (a) a.currentTime = Math.max(0, Math.min(duration, a.currentTime + s));
  };
  const handleVol = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v); if (audioRef.current) audioRef.current.volume = v; setMuted(v === 0);
  };
  const toggleMute = () => {
    const a = audioRef.current; if (!a) return;
    if (muted) { a.volume = volume || 0.85; setMuted(false); }
    else { a.volume = 0; setMuted(true); }
  };

  // Force-download via blob URL (no new tab)
  const download = () => {
    const link = document.createElement('a');
    link.href     = blobUrl;
    link.download = fileName || 'voiceai-audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0F172A', boxShadow: '0 8px 32px rgba(15,23,42,0.25)' }}>

      {/* Hidden audio element — plays in-browser, never opens new tab */}
      {blobUrl && <audio ref={audioRef} src={blobUrl} />}

      {/* Progress bar (clickable) */}
      <div className="h-1.5 cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={seek}>
        <div className="h-full rounded-r-full transition-all"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#2563EB,#10B981)' }} />
      </div>

      <div className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{fileName || 'Audio'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {fmtTime(current)} / {fmtTime(duration)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => skip(-10)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }} title="−10s">
            <FiSkipBack size={16} />
          </button>
          <button onClick={toggle}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 focus:outline-none"
            style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
            {playing
              ? <FiPause size={18} className="text-white" />
              : <FiPlay  size={18} className="text-white ml-0.5" />}
          </button>
          <button onClick={() => skip(10)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }} title="+10s">
            <FiSkipForward size={16} />
          </button>
        </div>

        {/* Volume + Download + Close */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="p-1.5 hover:bg-white/10 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            {muted ? <FiVolumeX size={15} /> : <FiVolume2 size={15} />}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={handleVol}
            className="w-20 hidden sm:block"
            style={{ accentColor: '#10B981' }} />
          <button onClick={download}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
            style={{ background: '#10B981' }} title="Download MP3">
            <FiDownload size={12} /> MP3
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/70">
            <FiX size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════
   Main TTS Page
   ═══════════════════════════════════════ */
export default function TTSPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [text,    setText]    = useState(() => location.state?.text || '');
  const [lang,    setLang]    = useState('en');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [fileName, setFileName] = useState(() => location.state?.title || '');
  const [error,   setError]   = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef  = useRef(null);

  const { notes, fetchNotes } = useNotes();
  const { session } = useAuthStore();

  useEffect(() => { fetchNotes(); }, []);

  // Cleanup blob on unmount
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  const MAX = 10000;

  /* ── Extract text from uploaded file ──────────── */
  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','txt'].includes(ext)) {
      setError('Supported formats: PDF, DOCX, TXT.'); return;
    }
    setError(''); setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post(`${API_URL}/api/notes/extract-text`, form, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      setText((data.text || '').slice(0, MAX));
      setFileName(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      // Fallback: read TXT file directly in browser
      if (ext === 'txt') {
        const reader = new FileReader();
        reader.onload = e => setText(e.target.result.slice(0, MAX));
        reader.readAsText(file);
      } else {
        setError('Could not extract text. Please paste the text manually.');
      }
    } finally {
      setExtracting(false);
    }
  };

  const onFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* ── Import from saved note ────────────────────── */
  const importNote = (note) => {
    const content = note.extracted_text || note.cleaned_text || note.description || note.title || '';
    setText(content.slice(0, MAX));
    setFileName(note.title);
    setShowNotes(false);
  };

  /* ── Convert to audio ──────────────────────────── */
  const convert = async () => {
    if (!text.trim()) { setError('Please enter some text first.'); return; }
    setError(''); setLoading(true);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }

    try {
      const { data } = await axios.post(
        `${API_URL}/api/tts/convert`,
        {
          text: text.trim(),
          language: lang,
          title: fileName || text.trim().split(' ').slice(0, 6).join(' ') + '…',
        },
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );

      // Always reconstruct URL from file name using current API_URL
      // (stored audioUrl may contain an old backend domain)
      const fileName = data.fileName || (data.audioUrl ? data.audioUrl.split('/').pop() : null);
      const audioSrc = fileName
        ? `${API_URL}/uploads/${fileName}`
        : data.audioUrl;

      const resp = await fetch(audioSrc);
      if (!resp.ok) throw new Error('Failed to fetch audio file.');
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      setFileName(fileName || data.fileName);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Conversion failed.');
    } finally {
      setLoading(false);
    }
  };

  const processedNotes = notes.filter(n => n.processing_status === 'completed' && (n.extracted_text || n.cleaned_text));

  /* ── styles ── */
  const S = {
    card:    { width: '100%', maxWidth: 820, background: '#1E293B', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' },
    toolbar: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' },
    select:  { background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#E2E8F0', padding: '7px 32px 7px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', appearance: 'none', outline: 'none' },
    btn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94A3B8', fontSize: 13, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' },
    textarea:{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#E2E8F0', fontSize: 15, lineHeight: 1.7, padding: '16px 18px 56px 18px', fontFamily: 'inherit', boxSizing: 'border-box' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 32 }}>

      {/* Sub-header with subtitle + Audio Library shortcut */}
      <div style={{ width: '100%', maxWidth: 820, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>Convert any text to natural audio · {LANGUAGES.length} languages</p>
        <button onClick={() => navigate('/podcasts')}
          style={{ ...S.btn, color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}>
          🎧 Audio Library
        </button>
      </div>

      <div style={S.card}>

          {/* Toolbar */}
          <div style={S.toolbar}>
            {/* Language selector */}
            <div style={{ position: 'relative' }}>
              <select value={lang} onChange={e => setLang(e.target.value)} style={S.select}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <FiChevronDown size={11} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
            </div>

            {/* Upload file */}
            <button onClick={() => fileRef.current?.click()} disabled={extracting} style={{ ...S.btn, color: '#6366F1', borderColor: 'rgba(99,102,241,0.3)' }}>
              {extracting
                ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', animation: 'spin 0.8s linear infinite' }} /> Extracting…</>
                : <><FiUpload size={12} /> Upload File</>}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.csv" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />

            {/* Import from notes */}
            {processedNotes.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowNotes(v => !v)} style={{ ...S.btn }}>
                  <FiFileText size={12} /> My Notes <FiChevronDown size={10} />
                </button>
                <AnimatePresence>
                  {showNotes && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowNotes(false)} />
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                        style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 260, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 36px rgba(0,0,0,0.4)', zIndex: 20, maxHeight: 220, overflowY: 'auto' }}>
                        {processedNotes.map(note => (
                          <button key={note.id} onClick={() => importNote(note)}
                            style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1', fontSize: 13 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <FiFileText size={12} color="#6366F1" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Clear */}
            {text && (
              <button onClick={() => { setText(''); setBlobUrl(null); setError(''); setFileName(''); }}
                style={{ ...S.btn, marginLeft: 'auto', color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}>
                <FiX size={11} /> Clear
              </button>
            )}
          </div>

          {/* Textarea area with integrated send button — ChatGPT style */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onFileDrop}
            style={{ position: 'relative', background: dragOver ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'background .2s' }}>

            {dragOver && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, pointerEvents: 'none' }}>
                <FiUpload size={36} color="#6366F1" />
                <p style={{ color: '#A5B4FC', fontWeight: 700, marginTop: 8 }}>Drop file here</p>
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX))}
              placeholder="Type or paste your text here…&#10;Or drag & drop a file above · Supports PDF, DOCX, TXT"
              rows={10}
              style={{ ...S.textarea, opacity: dragOver ? 0.2 : 1 }}
            />

            {/* Bottom bar inside textarea: char count + convert button */}
            <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <span style={{ fontSize: 11, color: text.length > MAX * 0.9 ? '#EF4444' : '#334155', fontWeight: 500, pointerEvents: 'none' }}>
                {text.length.toLocaleString()} / {MAX.toLocaleString()}
              </span>
              {/* Convert to Audio button — small, inside the input (like ChatGPT) */}
              <button
                onClick={convert}
                disabled={loading || !text.trim() || extracting}
                title="Click to convert text to audio"
                style={{
                  pointerEvents: 'all',
                  height: 36, borderRadius: 18, border: 'none', paddingLeft: 14, paddingRight: 14,
                  background: (loading || !text.trim() || extracting)
                    ? 'rgba(255,255,255,0.07)'
                    : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                  color: (loading || !text.trim() || extracting) ? '#475569' : '#fff',
                  cursor: (loading || !text.trim() || extracting) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700,
                  boxShadow: (!loading && text.trim()) ? '0 4px 14px rgba(99,102,241,0.45)' : 'none',
                  transition: 'all .2s', flexShrink: 0, fontFamily: 'inherit',
                }}>
                {loading
                  ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Converting…</>
                  : <><FiMic size={14} /> Click to Audio</>}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '8px 16px', padding: '9px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Audio Player */}
          <AnimatePresence>
            {blobUrl && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <AudioPlayer
                  blobUrl={blobUrl}
                  fileName={fileName || 'voiceai-audio.mp3'}
                  onClose={() => { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }}
                />
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#10B981' }}>
                  <span>✅ Saved to Audio Library —</span>
                  <button onClick={() => navigate('/podcasts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', fontWeight: 700, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 12 }}>View →</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      <p style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 4 }}>
        🔒 Audio is saved automatically · <button onClick={() => navigate('/podcasts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: 11, fontFamily: 'inherit' }}>Open Audio Library</button>
      </p>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
