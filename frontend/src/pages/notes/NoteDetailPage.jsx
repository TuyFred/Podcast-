/**
 * NoteDetailPage — view note details, read original document, generate AI content.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiFileText, FiClock, FiFile,
  FiHeadphones, FiCheckSquare, FiLayers, FiBookOpen,
  FiCopy, FiExternalLink, FiRefreshCw, FiDownload, FiEye,
  FiPlay, FiPause, FiVolume2,
} from 'react-icons/fi';
import useNotes from '@/hooks/useNotes';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidNoteId = (v) => {
  if (v == null) return false;
  const s = String(v).trim();
  return UUID_RE.test(s);
};

function resolveNoteId(paramId, stateId) {
  const normalize = (v) => {
    if (v == null || v === '') return '';
    try {
      return decodeURIComponent(String(v)).trim();
    } catch {
      return String(v).trim();
    }
  };
  const param = normalize(paramId);
  const state = normalize(stateId);
  if (isValidNoteId(param)) return param;
  if (isValidNoteId(state)) return state;
  return param || state;
}

function base64ToBlob(b64, mime = 'audio/mpeg') {
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/* ── helpers ─────────────────────────────── */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};
const STATUS_STYLE = {
  completed:  { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: '✅ Processed' },
  processing: { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', label: '⏳ Processing' },
  pending:    { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: '🔄 Pending' },
  failed:     { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', label: '❌ Failed' },
};
const FILE_ICON = { pdf: '📄', docx: '📝', doc: '📝', txt: '📋', pptx: '📊', ppt: '📊', csv: '📊', jpg: '🖼', jpeg: '🖼', png: '🖼' };

/* ── Spinner ── */
function Spinner({ size = 16 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid rgba(255,255,255,0.15)`, borderTopColor: '#6366F1', animation: 'spin .7s linear infinite', display: 'inline-block' }} />;
}

/* ── Inline podcast audio player ─────────── */
function PodcastAudioPlayer({ blobUrl, fileName, onGoLibrary }) {
  const audioRef = React.useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!blobUrl) return;
    const t = setTimeout(() => {
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [blobUrl]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'podcast.mp3';
    a.click();
  };

  return (
    <div style={{ marginTop: 20, padding: 20, borderRadius: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
      <p style={{ margin: '0 0 12px', color: '#A5B4FC', fontWeight: 700, fontSize: 14 }}>🎙 Podcast audio ready</p>
      <audio ref={audioRef} src={blobUrl} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={toggle}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {playing ? <FiPause size={16} /> : <FiPlay size={16} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={download}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FiDownload size={16} /> Download MP3
        </button>
        <button onClick={onGoLibrary}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FiVolume2 size={16} /> Audio Library
        </button>
      </div>
      <p style={{ margin: '10px 0 0', color: '#64748B', fontSize: 12 }}>Saved to your Audio Library automatically.</p>
    </div>
  );
}

/* ── Action card ─────────────────────────── */
function ActionCard({ icon, title, description, color, generating, result, onGenerate, onView, disabled }) {
  const isDisabled = disabled || generating;
  return (
    <div style={{ background: '#1E293B', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12, opacity: disabled ? 0.55 : 1, transition: 'opacity .2s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 4px', color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>{title}</h3>
        <p style={{ margin: 0, color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>{description}</p>
      </div>
      {result ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onView}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <FiExternalLink size={13} /> View Result
          </button>
          <button onClick={onGenerate} title="Regenerate" disabled={isDisabled}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748B', fontSize: 13, cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
            <FiRefreshCw size={13} />
          </button>
        </div>
      ) : (
        <button onClick={isDisabled ? undefined : onGenerate} disabled={isDisabled}
          style={{ padding: '10px 0', borderRadius: 10, border: 'none', background: isDisabled ? 'rgba(255,255,255,0.04)' : `${color}22`, color: isDisabled ? '#475569' : color, fontSize: 13, fontWeight: 700, cursor: isDisabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}>
          {generating ? <><Spinner size={14} /> Generating…</> : disabled ? '⏳ Processing…' : '⚡ Generate'}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DOCUMENT VIEWER
   Handles: PDF, DOCX, TXT, PPTX, CSV, Images
═══════════════════════════════════════════ */
function DocumentViewer({ note, token }) {
  const [state,    setState]    = useState('loading');
  const [html,     setHtml]     = useState('');
  const [blobUrl,  setBlobUrl]  = useState(null);
  const fileType = (note?.file_type || '').toLowerCase();

  const downloadUrl = `${API}/api/notes/${note?.id}/download`;
  const isImage     = ['jpg', 'jpeg', 'png'].includes(fileType);
  const isPDF       = fileType === 'pdf';
  const isRich      = isPDF || isImage;

  /* For PDF + images: fetch as blob (auth header), create object URL */
  useEffect(() => {
    if (!note?.id || !token) return;
    let revoke = null;

    if (isRich) {
      fetch(`${API}/api/notes/${note.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error(r.status === 404 ? 'nofile' : 'error');
          return r.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          revoke = url;
          setBlobUrl(url);
          setState('ready');
        })
        .catch(err => setState(err.message === 'nofile' ? 'nofile' : 'error'));
      return () => { if (revoke) URL.revokeObjectURL(revoke); };
    }

    // For DOCX / text: fetch HTML
    axios.get(`${API}/api/notes/${note.id}/as-html`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      setHtml(data?.html || '<p style="color:#64748B">No content available.</p>');
      setState('ready');
    }).catch(err => {
      const msg = err.response?.data?.message || '';
      setState(msg.includes('longer available') || err.response?.status === 404 ? 'nofile' : 'error');
    });
  }, [note?.id, token]);

  /* Download handler */
  const handleDownload = async () => {
    try {
      const resp = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) { toast.error('File no longer available on server.'); return; }
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = note.original_file_name || `${note.title}.${fileType}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Download failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: '#1E293B', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>{FILE_ICON[fileType] || '📄'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#F1F5F9', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note?.original_file_name || note?.title}</p>
          <p style={{ margin: 0, color: '#475569', fontSize: 11 }}>{fileType?.toUpperCase()} · {fmtSize(note?.file_size)}</p>
        </div>
        <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', fontSize: 11, fontWeight: 700 }}>{fileType?.toUpperCase()}</span>
        <button onClick={handleDownload}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <FiDownload size={13} /> Download
        </button>
      </div>

      {/* ── Viewer area ── */}
      <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 16px 16px', minHeight: 500, overflow: 'hidden', position: 'relative' }}>

        {/* PDF viewer */}
        {isPDF && state === 'ready' && blobUrl && (
          <iframe
            src={blobUrl}
            title={note?.title}
            style={{ width: '100%', height: 680, border: 'none', display: 'block' }}
          />
        )}

        {/* Image viewer */}
        {isImage && state === 'ready' && blobUrl && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 500 }}>
            <img
              src={blobUrl}
              alt={note?.title}
              style={{ maxWidth: '100%', maxHeight: 640, borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        )}

        {/* Loading */}
        {!isPDF && !isImage && state === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 14 }}>
            <Spinner size={32} />
            <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>Loading document…</p>
          </div>
        )}

        {/* File not on server */}
        {state === 'nofile' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14, textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>☁️</span>
            <h3 style={{ margin: 0, color: '#E2E8F0', fontWeight: 700 }}>File not on server</h3>
            <p style={{ margin: 0, color: '#64748B', fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
              The original file was stored on the server but may have been cleared (Render restarts ephemeral storage). The extracted text is still available in the "Extracted Text" tab.
            </p>
            {note?.extracted_text && (
              <div style={{ width: '100%', maxWidth: 640, background: '#1E293B', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: 20, textAlign: 'left', marginTop: 8 }}>
                <p style={{ margin: '0 0 12px', color: '#A5B4FC', fontSize: 13, fontWeight: 700 }}>📄 Extracted text preview:</p>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#94A3B8', fontSize: 13, lineHeight: 1.7, maxHeight: 300, overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                  {note.extracted_text.slice(0, 1200)}{note.extracted_text.length > 1200 ? '\n\n… (see Extracted Text tab for full content)' : ''}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
            <span style={{ fontSize: 40 }}>❌</span>
            <p style={{ color: '#F87171', margin: 0 }}>Could not load document.</p>
          </div>
        )}

        {/* DOCX / text HTML render */}
        {state === 'ready' && !isPDF && !isImage && html && (
          <div
            style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto', color: '#E2E8F0', lineHeight: 1.8, fontSize: 15, overflowY: 'auto', maxHeight: 680 }}
            dangerouslySetInnerHTML={{ __html: injectDocxStyles(html) }}
          />
        )}
      </div>
    </div>
  );
}

/* Inject beautiful styles into DOCX HTML */
function injectDocxStyles(html) {
  const css = `
    <style>
      h1,h2,h3,h4,h5,h6 { color: #F1F5F9; font-weight: 700; margin: 1.2em 0 .5em; line-height: 1.3; }
      h1 { font-size: 1.6em; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: .4em; }
      h2 { font-size: 1.3em; }
      h3 { font-size: 1.1em; color: #A5B4FC; }
      p  { margin: 0 0 .9em; color: #CBD5E1; }
      ul,ol { padding-left: 1.6em; margin: 0 0 .9em; color: #CBD5E1; }
      li { margin-bottom: .3em; }
      table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 13px; }
      th { background: rgba(99,102,241,0.15); color: #A5B4FC; padding: 10px 14px; text-align: left; font-weight: 700; border: 1px solid rgba(255,255,255,0.08); }
      td { padding: 9px 14px; border: 1px solid rgba(255,255,255,0.06); color: #CBD5E1; }
      tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
      strong,b { color: #F1F5F9; }
      em,i { color: #94A3B8; }
      pre,code { background: rgba(255,255,255,0.05); border-radius: 6px; padding: 2px 6px; font-family: ui-monospace, monospace; font-size: 13px; color: #67E8F9; }
      pre { padding: 14px 18px; display: block; overflow-x: auto; }
      a { color: #6366F1; }
      blockquote { border-left: 3px solid #6366F1; margin: .5em 0; padding: .5em 1em; color: #94A3B8; font-style: italic; }
      hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.5em 0; }
    </style>
  `;
  return css + html;
}


/* ── Main component ──────────────────────── */
export default function NoteDetailPage() {
  const { id: paramId } = useParams();
  const location        = useLocation();
  const navigate        = useNavigate();
  const { getNote }     = useNotes();
  const session         = useAuthStore(s => s.session);

  const routeNoteId = resolveNoteId(paramId, location.state?.noteId);

  const [note,         setNote]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState(null);
  const [activeTab,    setActiveTab]    = useState('generate');
  const [gen,          setGen]          = useState({});
  const [results,      setResults]      = useState({});
  const [podcastAudio, setPodcastAudio] = useState(null);

  /* load note */
  useEffect(() => {
    setLoadError(null);

    if (!isValidNoteId(routeNoteId)) {
      setLoading(false);
      setNote(null);
      setLoadError('Invalid note link — please open a note from My Notes');
      return;
    }

    let cancelled = false;
    setLoading(true);

    getNote(routeNoteId, { silent: true }).then(data => {
      if (cancelled) return;
      if (!data?.id) {
        setLoadError('Note not found — it may have been deleted');
        setLoading(false);
        return;
      }
      setNote(data);
      setLoading(false);
      // Fix broken URLs like /notes/undefined when we have a valid note id
      if (data.id && String(paramId) !== String(data.id)) {
        navigate(`/notes/${data.id}`, { replace: true, state: { noteId: data.id } });
      }
    }).catch(() => {
      if (cancelled) return;
      setLoadError('Failed to load note — check your connection and try again');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [routeNoteId, getNote, navigate, paramId]);

  /* cleanup podcast blob on unmount */
  useEffect(() => () => {
    if (podcastAudio?.blobUrl) URL.revokeObjectURL(podcastAudio.blobUrl);
  }, [podcastAudio]);

  /* generate helper — podcast: script + audio on same page */
  const generate = useCallback(async (type, extraBody = {}, storeAs = null) => {
    const noteId = note?.id ? String(note.id) : null;
    if (!noteId || !isValidNoteId(noteId)) {
      toast.error('Note ID missing — open this note from My Notes');
      return;
    }
    if (note.processing_status !== 'completed') {
      toast.error('Note is still processing — wait until extraction finishes');
      return;
    }

    const token = useAuthStore.getState().session?.access_token;
    if (!token) { toast.error('Not authenticated. Please log in again.'); return; }

    const key = storeAs || type;
    setGen(p => ({ ...p, [key]: true }));

    const warmupToast = toast.loading(
      type === 'podcast-script'
        ? 'Creating podcast script… ⏳'
        : 'Starting AI… this may take 30–90 seconds ⏳',
      { duration: 120000 }
    );

    try {
      const { data } = await axios.post(
        `${API}/api/notes/${noteId}/generate/${type}`,
        { numberOfQuestions: 20, numberOfFlashcards: 20, ...extraBody },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 }
      );
      toast.dismiss(warmupToast);

      if (type === 'podcast-script') {
        const script = (data.script || '').trim();
        if (!script) throw new Error('AI returned an empty script. Try again.');

        setResults(p => ({ ...p, [key]: data }));

        const ttsToast = toast.loading('Converting script to audio… 🔊', { duration: 180000 });
        const ttsText  = script.length > 30000 ? script.slice(0, 30000) : script;

        const { data: ttsData } = await axios.post(
          `${API}/api/tts/convert`,
          {
            text:     ttsText,
            language: 'en',
            title:    `Podcast: ${note.title}`,
            notesId:  noteId,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 180000 }
        );
        toast.dismiss(ttsToast);

        if (!ttsData?.audioBase64) throw new Error('Audio conversion failed — no audio received.');

        if (podcastAudio?.blobUrl) URL.revokeObjectURL(podcastAudio.blobUrl);
        const blob    = base64ToBlob(ttsData.audioBase64, ttsData.mimeType || 'audio/mpeg');
        const blobUrl = URL.createObjectURL(blob);
        setPodcastAudio({
          blobUrl,
          fileName: ttsData.fileName || `Podcast-${note.title}.mp3`,
        });

        if (script.length > 30000) {
          toast.success('Podcast audio ready! (Script trimmed to 30k chars for TTS) 🎙', { duration: 5000 });
        } else {
          toast.success('Podcast audio ready! Play below 🎙');
        }
        return;
      }

      setResults(p => ({ ...p, [key]: data }));
      toast.success(`${key.replace(/-/g, ' ')} generated! ✅`);
    } catch (e) {
      toast.dismiss();
      let msg = e.response?.data?.message || e.message || 'Failed to generate. Try again.';
      if (e.code === 'ECONNABORTED' || msg.includes('timeout'))
        msg = 'Request timed out — server may be waking up. Try again in 30 seconds.';
      if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid key'))
        msg = 'AI API key is invalid. Update GEMINI_API_KEY in Render Environment.';
      toast.error(msg, { duration: 6000 });
      console.error(`[Generate ${type}] noteId=${noteId}`, msg, e);
    } finally {
      setGen(p => ({ ...p, [key]: false }));
    }
  }, [note, navigate, podcastAudio]);

  /* ── render ── */
  const tabStyle = (active) => ({
    padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? '#6366F1' : '#64748B',
    borderBottom: `2px solid ${active ? '#6366F1' : 'transparent'}`,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, minHeight: '60vh' }}>
      <Spinner size={36} />
      <p style={{ color: '#475569', margin: 0 }}>Loading note…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (loadError || !note) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, minHeight: '60vh' }}>
      <p style={{ color: '#F87171', margin: 0 }}>{loadError || 'Note unavailable'}</p>
      <button onClick={() => navigate('/notes')}
        style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#6366F1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        ← Back to My Notes
      </button>
    </div>
  );

  const status  = STATUS_STYLE[note?.processing_status] || STATUS_STYLE.pending;
  const canGen  = note?.processing_status === 'completed';
  const noteText = note?.cleaned_text || note?.extracted_text || '';
  const token   = session?.access_token;

  return (
    <div style={{ color: '#F1F5F9', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── top bar ── */}
      <div style={{ padding: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <button onClick={() => navigate('/notes')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94A3B8', padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <FiArrowLeft size={13} /> My Notes
        </button>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: status.bg, color: status.color }}>
          {status.label}
        </span>
        <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiFile size={11} />{note?.file_type?.toUpperCase()} · {fmtSize(note?.file_size)}
        </span>
        <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiClock size={11} />{fmtDate(note?.created_at)}
        </span>
      </div>

      {/* ── title ── */}
      <div style={{ padding: '20px 0 0' }}>
        <h1 style={{ margin: '0 0 8px', color: '#F1F5F9', fontWeight: 800, fontSize: 22 }}>{note?.title}</h1>
        {note?.course_name && <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{note.course_name}{note.subject_area && ` · ${note.subject_area}`}</p>}
        {!canGen && (
          <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Spinner size={14} /> AI is extracting text from your document… please wait a moment then refresh.
          </div>
        )}
      </div>

      {/* ── tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 20, overflowX: 'auto' }}>
        {[
          { key: 'document', label: '📖 View Document' },
          { key: 'generate', label: '⚡ Generate' },
          { key: 'text',     label: '📄 Extracted Text' },
          { key: 'overview', label: 'ℹ️ Overview' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={tabStyle(activeTab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── tab content ── */}
      <div style={{ paddingTop: '24px', maxWidth: 1100 }}>

        {/* DOCUMENT VIEW TAB */}
        {activeTab === 'document' && (
          <DocumentViewer note={note} token={token} />
        )}

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div>
            {!canGen && (
              <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 14 }}>
                ⚠️ AI features will be available once text extraction is complete.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
              <ActionCard
                icon={<FiHeadphones />}
                title="Podcast Episode"
                color="#6366F1"
                description="Generates a podcast script from your note, converts it to audio, and saves it to your library — all on this page."
                generating={gen['podcast-script']}
                result={results['podcast-script'] || podcastAudio}
                disabled={!canGen}
                onGenerate={() => generate('podcast-script', { length: 'auto' })}
                onView={() => {
                  if (podcastAudio?.blobUrl) {
                    document.querySelector('[data-podcast-player]')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (results['podcast-script']?.script) {
                    navigate('/tts', { state: { text: results['podcast-script'].script, title: `Podcast: ${note.title}`, autoConvert: true } });
                  }
                }}
              />
              <ActionCard
                icon={<FiCheckSquare />}
                title="Smart Quiz"
                color="#F59E0B"
                description="Create a 20-question multiple-choice quiz based on your notes."
                generating={gen['quiz']}
                result={results['quiz']}
                disabled={!canGen}
                onGenerate={() => generate('quiz')}
                onView={() => navigate('/quizzes')}
              />
              <ActionCard
                icon={<FiLayers />}
                title="Flashcards Deck"
                color="#10B981"
                description="Extract key definitions and concepts into a spaced-repetition flashcard deck."
                generating={gen['flashcards']}
                result={results['flashcards']}
                disabled={!canGen}
                onGenerate={() => generate('flashcards')}
                onView={() => navigate('/flashcards')}
              />
              <ActionCard
                icon={<FiBookOpen />}
                title="Summary"
                color="#3B82F6"
                description="A detailed, structured summary covering all main points and sub-topics."
                generating={gen['summary']}
                result={results['summary']}
                disabled={!canGen}
                onGenerate={() => generate('summary')}
                onView={() => navigate('/summaries')}
              />
            </div>

            {podcastAudio?.blobUrl && (
              <div data-podcast-player>
                <PodcastAudioPlayer
                  blobUrl={podcastAudio.blobUrl}
                  fileName={podcastAudio.fileName}
                  onGoLibrary={() => navigate('/podcasts')}
                />
              </div>
            )}

            {/* Inline quiz result */}
            {results['quiz'] && (
              <div style={{ marginTop: 20, background: '#1E293B', borderRadius: 14, border: '1px solid rgba(245,158,11,0.25)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <p style={{ margin: 0, color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>Quiz saved! {results['quiz'].count || results['quiz'].questions?.length || 0} questions</p>
                  <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: 12 }}>Click "View Result" to play the quiz</p>
                </div>
                <button onClick={() => navigate('/quizzes')} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to Quizzes →
                </button>
              </div>
            )}

            {/* Inline flashcards result */}
            {results['flashcards'] && (
              <div style={{ marginTop: 12, background: '#1E293B', borderRadius: 14, border: '1px solid rgba(16,185,129,0.25)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <p style={{ margin: 0, color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>Flashcards saved! {results['flashcards'].count || results['flashcards'].flashcards?.length || 0} cards</p>
                  <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: 12 }}>Click "View Result" to study them</p>
                </div>
                <button onClick={() => navigate('/flashcards')} style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to Flashcards →
                </button>
              </div>
            )}

            {/* Inline summary preview */}
            {results['summary'] && (
              <div style={{ marginTop: 28, background: '#1E293B', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: 24 }}>
                <h3 style={{ margin: '0 0 14px', color: '#F1F5F9', fontWeight: 700, fontSize: 16 }}>
                  Generated Summary
                  <span style={{ marginLeft: 12, fontSize: 12, color: '#475569', fontWeight: 400 }}>{results['summary']?.wordCount} words</span>
                </h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#CBD5E1', fontSize: 14, lineHeight: 1.7, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                  {results['summary']?.content}
                </div>
                <button onClick={() => { const c = results['summary']?.content; if (c) { navigator.clipboard.writeText(c); toast.success('Copied!'); } }}
                  style={{ marginTop: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', padding: '6px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <FiCopy size={11} /> Copy
                </button>
              </div>
            )}
          </div>
        )}

        {/* EXTRACTED TEXT TAB */}
        {activeTab === 'text' && (
          <div style={{ background: '#1E293B', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#F1F5F9', fontWeight: 700, fontSize: 16 }}>
                Extracted Text
                {noteText && <span style={{ marginLeft: 10, fontSize: 12, color: '#475569', fontWeight: 400 }}>{noteText.length.toLocaleString()} chars</span>}
              </h3>
              {noteText && (
                <button onClick={() => { navigator.clipboard.writeText(noteText); toast.success('Copied!'); }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', padding: '6px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <FiCopy size={11} /> Copy all
                </button>
              )}
            </div>
            {noteText ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#94A3B8', fontSize: 13, lineHeight: 1.7, maxHeight: 600, overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                {noteText}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
                {note?.processing_status === 'pending' || note?.processing_status === 'processing'
                  ? <><Spinner size={28} /><p style={{ marginTop: 14 }}>Extracting text… please wait.</p></>
                  : <p>No text could be extracted from this document.</p>
                }
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {[
              { label: 'Title',       value: note?.title },
              { label: 'File Type',   value: note?.file_type?.toUpperCase() },
              { label: 'File Size',   value: fmtSize(note?.file_size) },
              { label: 'Status',      value: status.label },
              { label: 'Course',      value: note?.course_name || '—' },
              { label: 'Subject',     value: note?.subject_area || '—' },
              { label: 'Difficulty',  value: note?.difficulty_level || '—' },
              { label: 'Uploaded',    value: fmtDate(note?.created_at) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#1E293B', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 15, color: '#E2E8F0', fontWeight: 600 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
