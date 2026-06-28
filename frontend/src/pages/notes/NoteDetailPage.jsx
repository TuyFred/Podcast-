import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiFileText, FiClock, FiFile,
  FiHeadphones, FiCheckSquare, FiLayers, FiBookOpen,
  FiCopy, FiExternalLink, FiRefreshCw,
} from 'react-icons/fi';
import useNotes from '@/hooks/useNotes';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

/* ── small inline components ─────────────── */
function Spinner({ size = 16 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid rgba(255,255,255,0.15)`, borderTopColor: '#6366F1', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
  );
}

/* ── Action card ─────────────────────────── */
function ActionCard({ icon, title, description, color, generating, result, onGenerate, onView }) {
  const canGenerate = !generating && !result;
  const btnBg = result
    ? 'rgba(16,185,129,0.15)' : generating
    ? 'rgba(255,255,255,0.04)' : `${color}22`;
  const btnColor = result ? '#10B981' : generating ? '#64748B' : color;

  return (
    <div style={{ background: '#1E293B', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <button onClick={onGenerate} title="Regenerate"
            style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748B', fontSize: 13, cursor: 'pointer' }}>
            <FiRefreshCw size={13} />
          </button>
        </div>
      ) : (
        <button onClick={onGenerate} disabled={generating}
          style={{ padding: '10px 0', borderRadius: 10, border: 'none', background: btnBg, color: btnColor, fontSize: 13, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s', borderColor: 'transparent' }}>
          {generating ? <><Spinner size={14} /> Generating…</> : <><FiZap size={13} /> Generate</>}
        </button>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────── */
export default function NoteDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { getNote } = useNotes();
  const { session } = useAuthStore();

  const [note,      setNote]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('generate');
  const [gen,       setGen]       = useState({});   // { quiz, flashcards, summary, podcast }
  const [results,   setResults]   = useState({});

  /* load note */
  useEffect(() => {
    if (!id || id === 'undefined') { toast.error('Invalid note ID'); navigate('/notes'); return; }
    getNote(id).then(data => {
      if (!data) { toast.error('Note not found'); navigate('/notes'); return; }
      setNote(data);
      setLoading(false);
    });
  }, [id]);

  /* generate helper */
  const generate = useCallback(async (type, extraBody = {}, storeAs = null) => {
    if (!note) return;
    const key = storeAs || type;
    setGen(p => ({ ...p, [key]: true }));
    try {
      const { data } = await axios.post(
        `${API}/api/notes/${id}/generate/${type}`,
        { numberOfQuestions: 20, numberOfFlashcards: 20, ...extraBody },
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (type === 'podcast-script') {
        navigate('/tts', { state: { text: data.script, title: `Podcast: ${note.title}` } });
        return;
      }
      setResults(p => ({ ...p, [key]: data }));
      toast.success(`${key.replace(/-/g, ' ')} generated! ✅`);
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to generate. Try again.`);
    } finally {
      setGen(p => ({ ...p, [key]: false }));
    }
  }, [note, id, session]);

  /* ── render ── */
  const S = {
    tab: (active) => ({ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#6366F1' : '#64748B', borderBottom: `2px solid ${active ? '#6366F1' : 'transparent'}`, fontFamily: 'inherit', whiteSpace: 'nowrap' }),
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, minHeight: '60vh' }}>
      <Spinner size={36} />
      <p style={{ color: '#475569', margin: 0 }}>Loading note…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const status  = STATUS_STYLE[note?.processing_status] || STATUS_STYLE.pending;
  const canGen  = note?.processing_status === 'completed';
  const noteText = note?.cleaned_text || note?.extracted_text || '';

  return (
    <div style={{ color: '#F1F5F9', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── top bar ── */}
      <div style={{ padding: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <button onClick={() => navigate('/notes')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94A3B8', padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <FiArrowLeft size={13} /> My Notes
        </button>

        {/* status badge */}
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: status.bg, color: status.color }}>
          {status.label}
        </span>

        {/* meta */}
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
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0', marginTop: 20, overflowX: 'auto' }}>
        {[
          { key: 'generate', label: '⚡ Generate' },
          { key: 'text',     label: '📄 Extracted Text' },
          { key: 'overview', label: 'ℹ️ Overview' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={S.tab(activeTab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── tab content ── */}
      <div style={{ paddingTop: '24px', maxWidth: 1100 }}>

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div>
            {!canGen && (
              <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 14 }}>
                ⚠️ AI features will be available once text extraction is complete. Check back shortly.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>

              <ActionCard
                icon={<FiHeadphones />}
                title="Podcast Episode"
                color="#6366F1"
                description="Generate an engaging 5–10 minute podcast script from your notes, then convert to audio."
                generating={gen['podcast-script']}
                result={results['podcast-script']}
                onGenerate={() => generate('podcast-script', { length: 'auto' })}
                onView={() => navigate('/tts', { state: { text: results['podcast-script']?.script, title: `Podcast: ${note.title}` } })}
              />

              <ActionCard
                icon={<FiCheckSquare />}
                title="Smart Quiz"
                color="#F59E0B"
                description="Create a 20-question multiple-choice quiz to test your understanding."
                generating={gen['quiz']}
                result={results['quiz']}
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
                onGenerate={() => generate('summary')}
                onView={() => navigate('/summaries')}
              />

            </div>

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
            {(results['summary'] || results['exam'] || results['quick']) && (
              <div style={{ marginTop: 28, background: '#1E293B', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: 24 }}>
                <h3 style={{ margin: '0 0 14px', color: '#F1F5F9', fontWeight: 700, fontSize: 16 }}>
                  Generated Summary
                  <span style={{ marginLeft: 12, fontSize: 12, color: '#475569', fontWeight: 400 }}>
                    {(results['summary'] || results['exam'] || results['quick'])?.wordCount} words
                  </span>
                </h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#CBD5E1', fontSize: 14, lineHeight: 1.7, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                  {(results['summary'] || results['exam'] || results['quick'])?.content}
                </div>
                <button onClick={() => {
                  const c = (results['summary'] || results['exam'] || results['quick'])?.content;
                  if (c) { navigator.clipboard.writeText(c); toast.success('Copied!'); }
                }} style={{ marginTop: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', padding: '6px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
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
                  <FiCopy size={11} /> Copy
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
