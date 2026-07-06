/**
 * Student Dashboard — ChatGPT-inspired clean layout
 * - Center-focused "What would you like to study?" hero
 * - Quick-action chips
 * - Recent notes & podcasts in a clean list
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUpload, FiMic, FiHeadphones, FiCheckSquare,
  FiLayers, FiBookOpen, FiFileText, FiArrowRight,
  FiSearch, FiClock,
} from 'react-icons/fi';
import useAuthStore from '@/store/authStore';
import useNotes from '@/hooks/useNotes';
import usePodcasts from '@/hooks/usePodcasts';

/* ─── greeting ──────────────────────────────── */
const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* ─── Quick actions ──────────────────────────── */
const ACTIONS = [
  { icon: FiUpload,    label: 'Upload Notes',    path: '/notes',      style: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' } },
  { icon: FiMic,       label: 'Text to Speech',  path: '/tts',        style: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' } },
  { icon: FiHeadphones,label: 'My Podcasts',     path: '/podcasts',   style: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' } },
  { icon: FiCheckSquare,label: 'Take a Quiz',    path: '/quizzes',    style: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' } },
  { icon: FiLayers,    label: 'Flashcards',      path: '/flashcards', style: { bg: '#FDF2F8', color: '#DB2777', border: '#FBCFE8' } },
  { icon: FiBookOpen,  label: 'Summaries',       path: '/summaries',  style: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' } },
];

/* ═══════════════════════════════════════════════
   STUDENT Dashboard — ChatGPT layout
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { notes,    fetchNotes    } = useNotes();
  const { podcasts, fetchPodcasts } = usePodcasts();
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([fetchNotes(), fetchPodcasts()]).finally(() => setLoaded(true));
  }, []);

  const name = profile?.first_name || profile?.firstName || user?.email?.split('@')[0] || 'there';

  const completedPodcasts = podcasts.filter(p => p.generation_status === 'completed');
  const recentNotes    = notes.slice(0, 5);
  const recentPodcasts = completedPodcasts.slice(0, 5);

  const filteredNotes = search
    ? recentNotes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()))
    : recentNotes;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>

      {/* ═══════ HERO — ChatGPT style center area ═══════ */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 sm:pt-10 px-3 sm:px-4">
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>{greet()}</p>
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: '#0F172A' }}>
              What would you like to study, <span style={{ color: '#2563EB' }}>{name}</span>?
            </h1>
          </motion.div>

          {/* Stats pill row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { icon: FiFileText,    val: notes.length,            label: 'notes',    color: '#2563EB' },
              { icon: FiHeadphones,  val: completedPodcasts.length, label: 'podcasts', color: '#059669' },
              { icon: FiCheckSquare, val: 0,                        label: 'quizzes',  color: '#D97706' },
              { icon: FiLayers,      val: 0,                        label: 'flashcard sets', color: '#7C3AED' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#374151' }}>
                <s.icon size={12} style={{ color: s.color }} />
                <span className="font-bold" style={{ color: s.color }}>{loaded ? s.val : '…'}</span>
                {s.label}
              </div>
            ))}
          </motion.div>

          {/* ── Main Search / Input bar (ChatGPT style) ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="relative">
            <div className="flex items-center rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <FiSearch size={18} className="ml-4 flex-shrink-0" style={{ color: '#94A3B8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && search.trim()) navigate('/notes');
                }}
                placeholder="Search your notes or start something new…"
                className="flex-1 px-4 py-4 text-sm bg-transparent focus:outline-none"
                style={{ color: '#0F172A' }}
              />
              <div className="flex items-center gap-1.5 px-4">
                <button onClick={() => navigate('/notes')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                  <FiArrowRight size={12} /> Go
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Quick action chips ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
            className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 justify-center">
            {ACTIONS.map(({ icon: Icon, label, path, style: s }) => (
              <motion.button
                key={path}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(path)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                <Icon size={13} />
                <span className="truncate">{label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* ── Divider ── */}
          <div className="h-px w-full" style={{ background: '#E2E8F0' }} />

          {/* ── Recent content (Notes + Podcasts) ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Recent Notes */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #F8FAFC' }}>
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                  <FiFileText size={12} style={{ color: '#2563EB' }} /> Recent Notes
                </span>
                <button onClick={() => navigate('/notes')}
                  className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ color: '#2563EB' }}>
                  All <FiArrowRight size={10} />
                </button>
              </div>
              <div>
                {!loaded ? (
                  [1,2,3].map(i => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1"><div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4" /></div>
                    </div>
                  ))
                ) : filteredNotes.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs" style={{ color: '#94A3B8' }}>No notes yet.</p>
                    <button onClick={() => navigate('/notes')} className="mt-1 text-xs font-semibold"
                      style={{ color: '#2563EB' }}>Upload first note →</button>
                  </div>
                ) : filteredNotes.map(note => (
                  <button key={note.id} onClick={() => note.id && navigate(`/notes/${note.id}`, { state: { noteId: note.id } })}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      {(note.file_type || 'TXT').toUpperCase().slice(0,3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{note.title}</p>
                      <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: '#94A3B8' }}>
                        <FiClock size={9} /> {fmtDate(note.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Podcasts */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #F8FAFC' }}>
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                  <FiHeadphones size={12} style={{ color: '#059669' }} /> Recent Podcasts
                </span>
                <button onClick={() => navigate('/podcasts')}
                  className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ color: '#059669' }}>
                  All <FiArrowRight size={10} />
                </button>
              </div>
              <div>
                {!loaded ? (
                  [1,2,3].map(i => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1"><div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4" /></div>
                    </div>
                  ))
                ) : recentPodcasts.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs" style={{ color: '#94A3B8' }}>No podcasts yet.</p>
                    <button onClick={() => navigate('/tts')} className="mt-1 text-xs font-semibold"
                      style={{ color: '#059669' }}>Create your first →</button>
                  </div>
                ) : recentPodcasts.map(p => (
                  <button key={p.id} onClick={() => navigate('/podcasts')}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#ECFDF5', color: '#059669' }}>
                      <FiHeadphones size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{p.title}</p>
                      <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: '#94A3B8' }}>
                        <FiClock size={9} /> {fmtDate(p.created_at)}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: '#ECFDF5', color: '#059669' }}>▶</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Bottom tip ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,#F5F3FF,#EFF6FF)', border: '1px solid #DDD6FE' }}>
            <div className="flex items-start gap-2 flex-1">
              <span className="text-base flex-shrink-0">🎯</span>
              <p className="text-xs" style={{ color: '#4C1D95', margin: 0 }}>
                <strong>Quick tip:</strong> Upload a note → use <strong>Text to Speech</strong> → generate a <strong>Quiz</strong> from it.
              </p>
            </div>
            <button onClick={() => navigate('/tts')}
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl text-white hover:opacity-90 self-end sm:self-auto"
              style={{ background: '#7C3AED' }}>Try it</button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
