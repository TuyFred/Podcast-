/**
 * StudentDashboard — Full ChatGPT-style interface
 * Features: AI chat, file upload, microphone STT, TTS playback,
 * copy/like/dislike/regenerate, markdown, dark mode, chat history
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY = 'voiceai_chat_history';

/* ── Markdown-lite renderer ─────────────────────────────────────── */
function renderMd(text) {
  if (!text) return '';
  // Remove LaTeX
  let t = text
    .replace(/\$\$[\s\S]*?\$\$/g, '[equation]')
    .replace(/\$[^$]*?\$/g, '[equation]')
    .replace(/\\\([\s\S]*?\\\)/g, '[equation]')
    .replace(/\\\[[\s\S]*?\\\]/g, '[equation]');

  // Code blocks
  t = t.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;overflow-x:auto;margin:10px 0;font-size:13px;"><code style="color:#e2e8f0;font-family:monospace;white-space:pre;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  );
  // Inline code
  t = t.replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:2px 7px;border-radius:5px;font-size:0.88em;color:#a5b4fc;font-family:monospace">$1</code>');
  // Bold
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Headers
  t = t.replace(/^### (.+)$/gm, '<h4 style="color:#e2e8f0;font-weight:700;margin:14px 0 6px;font-size:1.05em">$1</h4>');
  t = t.replace(/^## (.+)$/gm, '<h3 style="color:#f1f5f9;font-weight:700;margin:16px 0 6px;font-size:1.12em">$1</h3>');
  t = t.replace(/^# (.+)$/gm, '<h2 style="color:#f1f5f9;font-weight:800;margin:16px 0 6px;font-size:1.2em">$1</h2>');
  // Lists
  t = t.replace(/^[\-\*] (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>');
  t = t.replace(/^(\d+)\. (.+)$/gm, '<li style="margin:4px 0;list-style-type:decimal;padding-left:4px">$2</li>');
  // Consecutive <li> → wrap in <ul>
  t = t.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, m => `<ul style="padding-left:20px;margin:8px 0">${m}</ul>`);
  // Horizontal rule
  t = t.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #334155;margin:14px 0"/>');
  // Paragraphs
  t = t.replace(/\n\n/g, '</p><p style="margin:8px 0">');
  t = t.replace(/\n/g, '<br/>');
  return `<p style="margin:0">${t}</p>`;
}

/* ── Quick action cards data ───────────────────────────────────── */
const QUICK = [
  { id: 'upload',    label: 'Upload Notes',    desc: 'PDF, DOCX, TXT, images',           emoji: '📁', color: '#6366F1', path: null        },
  { id: 'tts',       label: 'Text to Speech',  desc: 'Convert any text to audio',         emoji: '🎙', color: '#10B981', path: '/tts'      },
  { id: 'library',   label: 'Audio Library',   desc: 'Listen to all your TTS audio',      emoji: '🎧', color: '#F59E0B', path: '/podcasts'  },
  { id: 'quiz',      label: 'Take a Quiz',     desc: 'Test your knowledge',               emoji: '✅', color: '#3B82F6', path: '/quizzes'  },
  { id: 'flashcard', label: 'Flashcards',      desc: 'Smart revision cards',              emoji: '⚡', color: '#EC4899', path: '/flashcards'},
];

/* ── Upload modal ───────────────────────────────────────────────── */
function UploadModal({ onClose, onUploaded }) {
  const { user } = useAuthStore();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const ACCEPT = '.pdf,.docx,.doc,.txt,.pptx,.ppt,.csv,.jpg,.jpeg,.png';

  const pick = (f) => { if (!f) return; setFile(f); setTitle(f.name.replace(/\.[^/.]+$/, '')); };

  const submit = async () => {
    if (!file || !user) return;
    setBusy(true); setStatus('Uploading…');
    try {
      const token = useAuthStore.getState().session?.access_token;
      const form  = new FormData();
      form.append('file',  file);
      form.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
      await axios.post(`${API}/api/notes/upload`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setStatus('✅ Uploaded! AI is extracting text…');
      setTimeout(() => { onUploaded?.(); onClose(); }, 1200);
    } catch (e) {
      setStatus('❌ ' + (e.response?.data?.message || e.message || 'Upload failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1E293B', borderRadius: 20, width: '100%', maxWidth: 460, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center mb-5">
          <h2 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, margin: 0 }}>📁 Upload Document</h2>
          <button onClick={onClose} style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('sd-upload').click()}
          style={{ border: `2px dashed ${dragging ? '#6366F1' : '#334155'}`, borderRadius: 14, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(99,102,241,0.08)' : 'transparent', marginBottom: 14, transition: 'all .2s' }}>
          <input id="sd-upload" type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
          <div style={{ fontSize: 36, marginBottom: 6 }}>📂</div>
          {file
            ? <p style={{ color: '#A5B4FC', fontWeight: 600, margin: 0 }}>{file.name}</p>
            : <>
                <p style={{ color: '#94A3B8', margin: '0 0 4px', fontWeight: 500 }}>Drag & drop or click to browse</p>
                <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>PDF, DOCX, TXT, PPTX, CSV, JPG, PNG</p>
              </>
          }
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        {status && <p style={{ fontSize: 13, color: status.startsWith('✅') ? '#10B981' : '#F87171', marginBottom: 12 }}>{status}</p>}
        <button onClick={submit} disabled={!file || busy}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: !file || busy ? 'not-allowed' : 'pointer', opacity: !file || busy ? 0.5 : 1 }}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

/* ── Chat message component ─────────────────────────────────────── */
function Message({ msg, avatar, onRegenerate, onCopy }) {
  const isUser = msg.role === 'user';
  const [liked, setLiked]       = useState(null); // 'up' | 'down' | null
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied]     = useState(false);

  const speak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(msg.text);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  };

  const copy = () => {
    navigator.clipboard.writeText(msg.text).then(() => {
      setCopied(true);
      onCopy?.(msg.text);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, background: isUser ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'linear-gradient(135deg,#10B981,#0891B2)', color: '#fff' }}>
        {isUser ? avatar : '🤖'}
      </div>

      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Uploaded file badge */}
        {msg.file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 6, fontSize: 12, color: '#A5B4FC' }}>
            📎 {msg.file}
          </div>
        )}

        {/* Bubble */}
        <div style={{ padding: '12px 16px', borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: isUser ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#1E293B', color: isUser ? '#fff' : '#E2E8F0', fontSize: 14, lineHeight: 1.7, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
          {isUser
            ? <p style={{ margin: 0 }}>{msg.text}</p>
            : <div style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
          }
        </div>

        {/* Timestamp */}
        <span style={{ fontSize: 11, color: '#475569', marginTop: 4, paddingLeft: 2 }}>
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* AI action buttons */}
        {!isUser && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[
              { label: copied ? '✅ Copied' : '📋 Copy',  action: copy,      active: copied },
              { label: '🔊 ' + (speaking ? 'Stop' : 'Listen'), action: speak, active: speaking },
              { label: liked === 'up'   ? '👍 Liked'   : '👍', action: () => setLiked(liked === 'up' ? null : 'up'),   active: liked === 'up' },
              { label: liked === 'down' ? '👎 Disliked' : '👎', action: () => setLiked(liked === 'down' ? null : 'down'), active: liked === 'down' },
              { label: '🔄 Regenerate', action: onRegenerate, active: false },
            ].map(({ label, action, active }) => (
              <button key={label} onClick={action}
                style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${active ? '#6366F1' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: active ? '#A5B4FC' : '#64748B', fontSize: 12, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#E2E8F0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = active ? '#A5B4FC' : '#64748B'; }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuthStore();
  const name   = profile?.first_name || user?.email?.split('@')[0] || 'Student';
  const avatar = name.charAt(0).toUpperCase();

  /* ── state ── */
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [view, setView]   = useState('home'); // 'home' | 'chat'
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [input, setInput]       = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showUpload, setShowUpload]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [notes, setNotes]   = useState([]);
  const [stats, setStats]   = useState({ notes: 0, podcasts: 0, quizzes: 0 });
  const [darkMode, setDarkMode]   = useState(true);
  const [chatSessions, setChatSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('voiceai_sessions')) || []; } catch { return []; }
  });
  const [activeSession, setActiveSession] = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const recognitionRef = useRef(null);

  /* ── persist chat history ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  /* ── load data ── */
  useEffect(() => {
    if (!user) return;
    const token = useAuthStore.getState().session?.access_token;
    if (!token) return;
    Promise.all([
      axios.get(`${API}/api/notes/supabase-list`,  { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      axios.get(`${API}/api/auth/stats`,            { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: {} })),
    ]).then(([nr, sr]) => {
      setNotes((nr.data || []).slice(0, 5));
      const s = sr.data || {};
      setStats({ notes: s.notes || 0, podcasts: s.podcasts || 0, quizzes: s.quizzes || 0 });
    });
  }, [user]);

  /* ── scroll to bottom ── */
  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view, thinking]);

  /* ── STT microphone ── */
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Speech recognition not supported in this browser.');
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = e => { setInput(prev => prev + ' ' + e.results[0][0].transcript); };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    recognitionRef.current = r;
    r.start();
    setRecording(true);
  };

  /* ── saveSession — persiste la conversation dans localStorage ── */
  const saveSession = useCallback((msgs) => {
    if (msgs.length < 2) return;
    const firstUser = msgs.find(m => m.role === 'user');
    if (!firstUser) return;
    const sid = activeSession || Date.now().toString();
    const session = {
      id: sid,
      title: firstUser.text.substring(0, 50),
      messages: msgs,
      updatedAt: new Date().toISOString(),
    };
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sid);
      const updated = [session, ...filtered].slice(0, 20);
      localStorage.setItem('voiceai_sessions', JSON.stringify(updated));
      return updated;
    });
    if (!activeSession) setActiveSession(sid);
  }, [activeSession]);

  /* ── send message (supports file attachment for AI analysis) ── */
  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if ((!text && !pendingFile) || thinking) return;
    setInput('');
    const fileForAI  = pendingFile;
    const fileLabel  = pendingFile?.name || null;
    setPendingFile(null);
    setView('chat');

    const displayText = text || `📎 ${fileLabel}`;
    const userMsg = { role: 'user', text: displayText, file: fileLabel, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    try {
      const token = useAuthStore.getState().session?.access_token;
      let data;

      if (fileForAI) {
        // Send file + message together via multipart
        const form = new FormData();
        form.append('file', fileForAI);
        if (text) form.append('message', text);
        else form.append('message', 'Please read and summarize this document, then answer any questions I have about it.');
        const res = await axios.post(`${API}/api/chat/general`, form, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        data = res.data;
      } else {
        const res = await axios.post(`${API}/api/chat/general`,
          { message: text },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        data = res.data;
      }

      const aiMsg = { role: 'model', text: data.answer, timestamp: new Date().toISOString() };
      setMessages(prev => {
        const updated = [...prev, aiMsg];
        saveSession(updated);
        return updated;
      });
    } catch (e) {
      const offline = e.code === 'ERR_NETWORK';
      setMessages(prev => [...prev, {
        role: 'model',
        text: offline
          ? '⚠️ Cannot reach the AI server. Make sure the backend is running on port 5000.'
          : `⚠️ Error: ${e.response?.data?.message || e.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, pendingFile, saveSession]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) send(lastUser.text);
  }, [messages, send]);

  const loadSession = (session) => {
    setMessages(session.messages);
    setActiveSession(session.id);
    setView('chat');
  };

  const newChat = () => {
    if (messages.length >= 2) saveSession(messages);
    setMessages([]);
    setActiveSession(null);
    localStorage.removeItem(STORAGE_KEY);
    setView('home');
    setInput('');
  };

  const clearChat = () => {
    setMessages([]);
    setActiveSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const bg = darkMode ? '#0F172A' : '#F1F5F9';
  const sidebar = darkMode ? '#0B1120' : '#1E3A8A';

  /* ─────────────────────────── SIDEBAR ── */
  const SideItem = ({ emoji, label, active, onClick }) => (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active ? 'rgba(99,102,241,0.2)' : 'transparent', color: active ? '#A5B4FC' : '#94A3B8', fontSize: 14, fontWeight: active ? 600 : 400, textAlign: 'left', transition: 'all .15s' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#E2E8F0'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}}>
      <span>{emoji}</span>
      {sidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  );

  /* ─────────────────────────── HOME ── */
  const HomeView = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 12px 100px' : '40px 48px 120px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 22 : 30, fontWeight: 800, background: 'linear-gradient(135deg,#A5B4FC,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
          What can I help you with, {name}?
        </h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: isMobile ? 13 : 15 }}>Ask me anything — or use one of the tools below.</p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: isMobile ? 10 : 14, maxWidth: 960, margin: '0 auto 28px' }}>
        {QUICK.map(q => (
          <button key={q.id} onClick={() => q.path ? navigate(q.path) : setShowUpload(true)}
            style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: isMobile ? '14px 12px' : '20px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = q.color + '44'; e.currentTarget.style.boxShadow = `0 8px 28px ${q.color}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{q.emoji}</div>
            <p style={{ margin: '0 0 4px', color: '#E2E8F0', fontWeight: 700, fontSize: 14 }}>{q.label}</p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 12, lineHeight: 1.4 }}>{q.desc}</p>
          </button>
        ))}
      </div>

      {/* Suggestion chips */}
      <div style={{ maxWidth: 960, margin: '0 auto 24px', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {['Explain photosynthesis simply', 'Summarize my notes', 'Create a study plan', 'What is machine learning?', 'Help me write an essay intro', 'Solve this math problem'].map(s => (
          <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
            style={{ padding: '7px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94A3B8', fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#A5B4FC'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
            {s}
          </button>
        ))}
      </div>

      {/* Bottom: recent docs + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 24, maxWidth: 960, margin: '0 auto' }}>
        {/* Recent docs */}
        <div style={{ background: '#1E293B', borderRadius: 20, padding: 22, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>📁 Recent Documents</h3>
            <button onClick={() => navigate('/notes')} style={{ color: '#6366F1', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
          </div>
          {notes.length === 0
            ? <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#475569', fontSize: 13, margin: '0 0 10px' }}>No documents yet</p>
                <button onClick={() => setShowUpload(true)} style={{ padding: '7px 16px', borderRadius: 9, background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  + Upload first note
                </button>
              </div>
            : notes.map(n => (
                <div key={n.id || n.title} onClick={() => {
                  if (!n.id) { return; }
                  navigate(`/notes/${n.id}`, { state: { noteId: n.id } });
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 3, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{n.file_type === 'pdf' ? '📕' : n.file_type === 'docx' ? '📘' : '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', color: '#E2E8F0', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 11 }}>{n.file_type?.toUpperCase()} · {new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Stats */}
        <div style={{ background: '#1E293B', borderRadius: 20, padding: 22, border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>📊 Your Learning Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { icon: '📄', label: 'Notes', value: stats.notes,    color: '#6366F1' },
              { icon: '🎙', label: 'Podcasts', value: stats.podcasts, color: '#F59E0B' },
              { icon: '✅', label: 'Quizzes', value: stats.quizzes,  color: '#10B981' },
              { icon: '🔥', label: 'Streak', value: '7 days',       color: '#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0F172A', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <p style={{ margin: '6px 0 2px', color: '#F1F5F9', fontWeight: 800, fontSize: 22 }}>{s.value}</p>
                <p style={{ margin: 0, color: '#64748B', fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'linear-gradient(135deg,#1D4ED8,#4F46E5)', borderRadius: 12, padding: 14 }}>
            <p style={{ margin: '0 0 4px', color: '#fff', fontWeight: 700, fontSize: 13 }}>🎉 You're on a roll!</p>
            <p style={{ margin: 0, color: '#BFDBFE', fontSize: 12 }}>Keep studying to maintain your streak.</p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────── RENDER ── */
  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', overflow: 'hidden' }}>

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />
      )}

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside style={{
        width: sidebarOpen ? 240 : (isMobile ? 0 : 66),
        flexShrink: 0,
        background: sidebar,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .25s ease',
        overflow: 'hidden',
        ...(isMobile ? { position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, width: sidebarOpen ? 240 : 0 } : {}),
      }}>
        {/* Logo + toggle */}
        <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🎙</div>
          {sidebarOpen && <span style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 16 }}>VoiceAI</span>}
          <button onClick={() => setSidebarOpen(v => !v)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* New Chat button */}
        <div style={{ padding: '12px 10px 8px' }}>
          <button onClick={newChat} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: 8, padding: sidebarOpen ? '10px 14px' : 10, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
            {sidebarOpen && 'New Chat'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
          <SideItem emoji="🏠" label="Home"           active={view === 'home'} onClick={() => setView('home')} />
          <SideItem emoji="📁" label="My Notes"     active={false}          onClick={() => navigate('/notes')} />
          <SideItem emoji="🎙" label="Text to Speech" active={false}        onClick={() => navigate('/tts')} />
          <SideItem emoji="🎧" label="Audio Library" active={false}         onClick={() => navigate('/podcasts')} />
          <SideItem emoji="✅" label="Quizzes"       active={false}         onClick={() => navigate('/quizzes')} />
          <SideItem emoji="⚡" label="Flashcards"    active={false}         onClick={() => navigate('/flashcards')} />
          <SideItem emoji="📝" label="Summaries"     active={false}         onClick={() => navigate('/summaries')} />

          {sidebarOpen && chatSessions.length > 0 && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 6px 8px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 6px' }}>
                <p style={{ margin: 0, color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Chat History</p>
                <button
                  onClick={() => { setChatSessions([]); localStorage.removeItem('voiceai_sessions'); }}
                  title="Clear all history"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 11, padding: '0 2px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                  Clear all
                </button>
              </div>
              {chatSessions.slice(0, 8).map((s) => (
                <div key={s.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity = '0'}>
                  <button onClick={() => loadSession(s)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 32px 7px 12px', border: 'none', background: activeSession === s.id ? 'rgba(99,102,241,0.15)' : 'transparent', cursor: 'pointer', borderRadius: 8, textAlign: 'left', borderLeft: activeSession === s.id ? '2px solid #6366F1' : '2px solid transparent' }}
                    onMouseEnter={e => { if (activeSession !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (activeSession !== s.id) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>💬</span>
                    <span style={{ color: activeSession === s.id ? '#A5B4FC' : '#94A3B8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {s.title}
                    </span>
                  </button>
                  {/* Per-item delete button */}
                  <button className="del-btn" onClick={() => {
                    const updated = chatSessions.filter(x => x.id !== s.id);
                    setChatSessions(updated);
                    localStorage.setItem('voiceai_sessions', JSON.stringify(updated));
                    if (activeSession === s.id) { setMessages([]); setActiveSession(null); setView('home'); }
                  }}
                    style={{ position: 'absolute', right: 6, opacity: 0, transition: 'opacity .15s', background: 'rgba(15,23,42,0.9)', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    title="Delete this chat">
                    ×
                  </button>
                </div>
              ))}
            </>
          )}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 10 }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 13, flexShrink: 0 }}>{avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                <p style={{ margin: 0, color: '#64748B', fontSize: 11 }}>Student</p>
              </div>
              <button onClick={() => setDarkMode(v => !v)} title="Toggle dark/light mode" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          )}
          <SideItem emoji="🚪" label="Sign Out" active={false} onClick={handleLogout} />
        </div>
      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: darkMode ? '#0B1220' : '#F8FAFC', marginLeft: isMobile ? 0 : undefined }}>

        {/* ── Top bar (always visible on mobile) ── */}
        <div style={{ padding: isMobile ? '10px 14px' : '10px 16px', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', gap: 10, background: darkMode ? '#0B1120' : '#fff', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            ☰
          </button>
          {view === 'chat' ? (
            <>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: darkMode ? '#F1F5F9' : '#0F172A', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>VoiceAI Assistant</p>
                <p style={{ margin: 0, color: '#22C55E', fontSize: 11 }}>● Online</p>
              </div>
              <button onClick={clearChat} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, background: 'transparent', color: darkMode ? '#64748B' : '#94A3B8', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>🗑 Clear</button>
              <button onClick={newChat} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, background: 'transparent', color: darkMode ? '#64748B' : '#94A3B8', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>＋ New</button>
            </>
          ) : (
            <p style={{ margin: 0, color: darkMode ? '#F1F5F9' : '#0F172A', fontWeight: 700, fontSize: 14, flex: 1 }}>VoiceAI</p>
          )}
        </div>

        {/* ── Header (desktop chat only) ── */}
        {false && view === 'chat' && (
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', gap: 12, background: darkMode ? '#0B1220' : '#fff' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <p style={{ margin: 0, color: darkMode ? '#F1F5F9' : '#0F172A', fontWeight: 700, fontSize: 15 }}>VoiceAI Assistant</p>
              <p style={{ margin: 0, color: '#22C55E', fontSize: 12 }}>● Online · Gemini 2.5 Flash</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={clearChat} title="Clear chat" style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, background: 'transparent', color: darkMode ? '#64748B' : '#94A3B8', cursor: 'pointer', fontSize: 12 }}>
                🗑 Clear
              </button>
              <button onClick={newChat} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, background: 'transparent', color: darkMode ? '#64748B' : '#94A3B8', cursor: 'pointer', fontSize: 12 }}>
                ＋ New Chat
              </button>
            </div>
          </div>
        )}

        {/* ── Home / Chat area ── */}
        {view === 'home'
          ? <HomeView />
          : (
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 10px' : '28px 24px', maxWidth: 860, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                  <p style={{ margin: 0, fontWeight: 600, color: darkMode ? '#94A3B8' : '#64748B' }}>Start a conversation — ask me anything!</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} avatar={avatar} onRegenerate={regenerate} onCopy={t => {}} />
              ))}
              {thinking && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                  <div style={{ background: '#1E293B', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366F1', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                  <span style={{ color: '#475569', fontSize: 12 }}>AI is thinking…</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )
        }

        {/* ── Input bar ── */}
        <div style={{ padding: isMobile ? '8px 10px 10px' : '12px 24px 16px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0'}`, background: darkMode ? '#0B1220' : '#F8FAFC' }}>
          {/* Pending file badge */}
          {pendingFile && (
            <div style={{ maxWidth: 860, margin: '0 auto 8px', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', width: 'fit-content' }}>
              <span style={{ color: '#A5B4FC', fontSize: 13 }}>📎 {pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}

          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: isMobile ? 6 : 8, alignItems: 'flex-end' }}>
            {/* File upload */}
            <button onClick={() => { const el = document.getElementById('file-in'); el && el.click(); }}
              title="Attach file"
              style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, background: darkMode ? '#1E293B' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
              ＋
            </button>
            <input id="file-in" type="file" accept=".pdf,.docx,.doc,.txt,.csv,.jpg,.jpeg,.png" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) { setPendingFile(e.target.files[0]); setView('chat'); } }} />

            {/* Text area */}
            <div style={{ flex: 1, background: darkMode ? '#1E293B' : '#fff', borderRadius: 16, border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`, display: 'flex', alignItems: 'flex-end', padding: '10px 12px', gap: 8, boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask anything… (Enter to send, Shift+Enter for new line)" rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: darkMode ? '#F1F5F9' : '#0F172A', fontSize: 15, lineHeight: 1.55, maxHeight: 140, overflow: 'auto', fontFamily: 'inherit' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }} />

              {/* Mic button */}
              <button onClick={toggleMic} title={recording ? 'Stop recording' : 'Speak'}
                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', background: recording ? '#EF444422' : 'transparent', color: recording ? '#EF4444' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, transition: 'all .2s' }}>
                🎤
              </button>

              {/* Send button */}
              <button onClick={() => send()} disabled={!input.trim() && !pendingFile}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: (input.trim() || pendingFile) ? 'pointer' : 'not-allowed', background: (input.trim() || pendingFile) ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', fontSize: 16 }}>
                ➤
              </button>
            </div>
          </div>
          <p style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 8 }}>VoiceAI can make mistakes. Always verify important information.</p>
        </div>
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => {}} />}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  );
}
