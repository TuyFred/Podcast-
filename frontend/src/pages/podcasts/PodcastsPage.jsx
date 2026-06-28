/**
 * Audio Library — shows all Text-to-Speech conversions.
 * Features: inline play, download, rename, delete.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmtTime  = (s) => !s || isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const fmtDate  = (d) => !d ? '' : new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
const fmtSize  = (b) => { if (!b) return ''; if (b>1_000_000) return `${(b/1_000_000).toFixed(1)} MB`; return `${Math.round(b/1000)} KB`; };

/* ── Floating Player ─────────────────────────── */
function Player({ item, onClose }) {
  const audioRef = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted,    setMuted]    = useState(false);
  const [ready,    setReady]    = useState(false);

  // Always reconstruct from audio_file_path so it works in both local & production
  const src = item.audio_file_path
    ? `${API}/uploads/${item.audio_file_path.split('/').pop()}`
    : item.audio_url || null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setReady(false); setPlaying(false); setCurrent(0); setDuration(0);
    const onMeta = () => { setDuration(a.duration || 0); setReady(true); };
    const onCanPlay = () => setReady(true);
    const onTime = () => setCurrent(a.currentTime);
    const onEnd  = () => setPlaying(false);
    const onErr  = (e) => { console.warn('[Player] Audio error:', e); setReady(false); };
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('canplay',        onCanPlay);
    a.addEventListener('timeupdate',     onTime);
    a.addEventListener('ended',          onEnd);
    a.addEventListener('error',          onErr);
    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('canplay',        onCanPlay);
      a.removeEventListener('timeupdate',     onTime);
      a.removeEventListener('ended',          onEnd);
      a.removeEventListener('error',          onErr);
    };
  }, [item.id]);

  const toggle = () => {
    const a = audioRef.current; if (!a || !src) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(err => console.warn('[Player] play failed:', err)); }
  };
  const seek = (e) => {
    const pct = e.nativeEvent.offsetX / e.currentTarget.offsetWidth;
    const a = audioRef.current;
    if (a && duration) { a.currentTime = pct * duration; setCurrent(pct * duration); }
  };
  const skip = (s) => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, Math.min(duration, a.currentTime + s)); };
  const toggleMute = () => { const a = audioRef.current; if (a) { a.muted = !muted; setMuted(v => !v); } };
  const download = () => {
    if (!src) return;
    const a = document.createElement('a'); a.href = src; a.download = `${item.title}.mp3`; a.click();
  };
  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:'#0F172A', borderTop:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 -8px 32px rgba(0,0,0,0.4)', fontFamily:'inherit' }}>
      {src && <audio ref={audioRef} src={src} />}
      {/* Progress */}
      <div style={{ height:3, background:'rgba(255,255,255,0.08)', cursor:'pointer' }} onClick={seek}>
        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#6366F1,#10B981)', transition:'width .1s linear' }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 22px' }}>
        <div style={{ width:40, height:40, borderRadius:12, background:'rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎧</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, color:'#F1F5F9', fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>
          <p style={{ margin:0, color:'#475569', fontSize:12 }}>{fmtTime(current)} / {fmtTime(duration)}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => skip(-10)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:4 }}>⏮</button>
          <button onClick={toggle} disabled={!src}
            style={{ width:44, height:44, borderRadius:'50%', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366F1,#10B981)', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', opacity: !src ? 0.4 : 1 }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => skip(10)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:4 }}>⏭</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={toggleMute} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#64748B' }}>{muted ? '🔇' : '🔊'}</button>
          <button onClick={download} style={{ padding:'6px 14px', borderRadius:9, border:'none', background:'#10B981', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>⬇ MP3</button>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:20, padding:4 }}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ── Audio Card ─────────────────────────────── */
function AudioCard({ item, isPlaying, onPlay, onDelete, onRename }) {
  const [editing,  setEditing]  = useState(false);
  const [newTitle, setNewTitle] = useState(item.title || '');
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = (e) => { e.stopPropagation(); setNewTitle(item.title || ''); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    if (!newTitle.trim() || newTitle.trim() === item.title) { cancelEdit(); return; }
    setSaving(true);
    await onRename(item.id, newTitle.trim());
    setSaving(false);
    setEditing(false);
  };

  const src = item.audio_file_path
    ? `${API}/uploads/${item.audio_file_path.split('/').pop()}`
    : item.audio_url || null;

  return (
    <div style={{ background:'#1E293B', borderRadius:20, border: isPlaying ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.07)', boxShadow: isPlaying ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none', overflow:'hidden', transition:'all .2s', fontFamily:'inherit' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#6366F1,#10B981)' }} />

      <div style={{ padding:'18px 20px 14px' }}>
        {/* Icon + badge */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background: isPlaying ? 'linear-gradient(135deg,#6366F1,#10B981)' : 'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            {isPlaying ? '🎵' : '🎧'}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ padding:'3px 10px', borderRadius:99, background:'rgba(16,185,129,0.12)', color:'#10B981', fontSize:11, fontWeight:700 }}>✓ Ready</span>
            {/* Edit / rename button */}
            <button onClick={startEdit} title="Rename"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#94A3B8', fontSize:12, cursor:'pointer', padding:'3px 8px' }}>
              ✏️
            </button>
          </div>
        </div>

        {/* Title — inline editable */}
        {editing ? (
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            <input ref={inputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              style={{ flex:1, background:'#0F172A', border:'1px solid #6366F1', borderRadius:8, color:'#F1F5F9', padding:'6px 10px', fontSize:14, fontFamily:'inherit', outline:'none' }}
              maxLength={100}
            />
            <button onClick={saveEdit} disabled={saving}
              style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#6366F1', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={cancelEdit}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#64748B', fontSize:12, cursor:'pointer' }}>
              ✕
            </button>
          </div>
        ) : (
          <h3 style={{ margin:'0 0 6px', fontSize:14, fontWeight:700, color:'#F1F5F9', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', cursor:'pointer' }}
            onDoubleClick={startEdit} title="Double-click to rename">
            {item.title}
          </h3>
        )}

        {item.description && !editing && (
          <p style={{ margin:'0 0 10px', fontSize:12, color:'#475569', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.description}
          </p>
        )}

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {item.language && <span style={{ fontSize:11, color:'#475569' }}>🌐 {item.language.toUpperCase()}</span>}
          {item.duration && <span style={{ fontSize:11, color:'#475569' }}>⏱ {fmtTime(item.duration)}</span>}
          {item.audio_file_size && <span style={{ fontSize:11, color:'#475569' }}>💾 {fmtSize(item.audio_file_size)}</span>}
          <span style={{ fontSize:11, color:'#475569' }}>📅 {fmtDate(item.created_at)}</span>
        </div>
      </div>

      <div style={{ padding:'0 14px 14px', display:'flex', gap:8 }}>
        <button onClick={() => onPlay(item)}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', borderRadius:12, border:'none', cursor:'pointer', background: isPlaying ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: isPlaying ? '#A5B4FC' : '#fff', fontWeight:700, fontSize:13 }}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {src && (
          <a href={src} download={`${item.title}.mp3`}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', borderRadius:12, background:'rgba(16,185,129,0.12)', color:'#10B981', fontWeight:700, fontSize:13, textDecoration:'none', border:'1px solid rgba(16,185,129,0.2)' }}>
            ⬇ MP3
          </a>
        )}

        <button onClick={() => onDelete(item)}
          style={{ width:38, height:38, borderRadius:12, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', background:'rgba(239,68,68,0.08)', color:'#EF4444', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
          🗑
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────── */
export default function PodcastsPage() {
  const navigate      = useNavigate();
  const { session }   = useAuthStore();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState('');

  const token = session?.access_token;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axios.get(`${API}/api/podcasts/supabase-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(data || []);
    } catch {
      setError('Failed to load audio library. Make sure the backend is running.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await axios.delete(`${API}/api/podcasts/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.filter(x => x.id !== item.id));
      if (current?.id === item.id) setCurrent(null);
    } catch { alert('Delete failed. Please try again.'); }
  };

  const handleRename = async (id, title) => {
    try {
      await axios.patch(`${API}/api/podcasts/${id}/rename`, { title }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.map(x => x.id === id ? { ...x, title } : x));
      if (current?.id === id) setCurrent(c => ({ ...c, title }));
    } catch (e) {
      alert(e.response?.data?.message || 'Rename failed.');
    }
  };

  const visible = items.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) ||
               p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: current ? 120 : 24 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ margin:'0 0 4px', fontSize:26, fontWeight:800, color:'#F1F5F9' }}>🎧 Audio Library</h1>
            <p style={{ margin:0, color:'#475569', fontSize:14 }}>
              {items.length} recording{items.length !== 1 ? 's' : ''} · All your Text-to-Speech audio
            </p>
          </div>
          <button onClick={() => navigate('/tts')}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>
            🎙 New Conversion
          </button>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:22, maxWidth:400 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'#475569' }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search audio…"
            style={{ width:'100%', padding:'10px 14px 10px 38px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'#1E293B', color:'#F1F5F9', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
        </div>

        {/* Tip */}
        <div style={{ marginBottom:20, padding:'10px 14px', borderRadius:12, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)', color:'#A5B4FC', fontSize:12, display:'flex', gap:6 }}>
          💡 <span>Click <b>▶ Play</b> to listen inline · <b>⬇ MP3</b> to download · Click <b>✏️</b> or double-click the title to rename</span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#FCA5A5', marginBottom:20, fontSize:14 }}>
            ⚠️ {error} <button onClick={load} style={{ marginLeft:8, background:'none', border:'none', cursor:'pointer', color:'#6366F1', fontSize:13, fontFamily:'inherit', fontWeight:700 }}>Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ borderRadius:20, height:220, background:'#1E293B', animation:'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign:'center', padding:'70px 20px' }}>
            <div style={{ fontSize:56, marginBottom:14 }}>🎧</div>
            <h3 style={{ margin:'0 0 8px', fontSize:20, fontWeight:700, color:'#F1F5F9' }}>
              {search ? 'No results' : 'No audio yet'}
            </h3>
            <p style={{ margin:'0 0 24px', color:'#475569', fontSize:14 }}>
              {search ? 'Try a different search term.' : 'Convert text to speech and your audio will appear here automatically.'}
            </p>
            {!search && (
              <button onClick={() => navigate('/tts')}
                style={{ padding:'12px 28px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                🎙 Go to Text to Speech
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && visible.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {visible.map(item => (
              <AudioCard
                key={item.id}
                item={item}
                isPlaying={current?.id === item.id}
                onPlay={p => setCurrent(cur => cur?.id === p.id ? null : p)}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}

      {/* Floating player */}
      {current && <Player item={current} onClose={() => setCurrent(null)} />}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
