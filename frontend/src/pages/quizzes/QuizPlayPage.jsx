/**
 * QuizPlayPage — loads real quiz from backend, shows questions,
 * displays score + correct answers after submission, allows retry.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRefreshCw, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Spinner() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366F1', animation: 'spin .7s linear infinite' }} />
  );
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function QuizPlayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [quiz,     setQuiz]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [phase,    setPhase]    = useState('play'); // 'play' | 'results'

  // Playing state
  const [qIndex,   setQIndex]   = useState(0);
  const [answers,  setAnswers]  = useState({}); // { questionIndex: chosenOptionIndex }
  const [chosen,   setChosen]   = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Results state
  const [score,    setScore]    = useState(0);
  const [correct,  setCorrect]  = useState(0);
  const [review,   setReview]   = useState(false); // show answer review

  /* ── Load quiz ── */
  useEffect(() => {
    if (!id) return;
    const token = session?.access_token;
    axios.get(`${API}/api/quizzes/${id}/play`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setQuiz(data);
        // Time: 45s per question
        setTimeLeft((data.questions?.length || 10) * 45);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load quiz.');
        setLoading(false);
      });
  }, [id]);

  /* ── Timer ── */
  useEffect(() => {
    if (phase !== 'play' || !quiz || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleFinish(answers); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, quiz]);

  /* ── Select option ── */
  const select = (idx) => setChosen(idx);

  /* ── Next question ── */
  const next = () => {
    const updated = { ...answers, [qIndex]: chosen };
    setAnswers(updated);
    if (qIndex < questions.length - 1) {
      setQIndex(q => q + 1);
      setChosen(null);
    } else {
      handleFinish(updated);
    }
  };

  /* ── Finish: calculate score ── */
  const handleFinish = async (finalAnswers) => {
    clearInterval(timerRef.current);
    const qs = quiz?.questions || [];
    let correctCount = 0;
    qs.forEach((q, i) => {
      const userIdx = finalAnswers[i];
      if (userIdx !== null && userIdx !== undefined && userIdx === q.correctAnswer) correctCount++;
    });
    const finalScore = Math.round((correctCount / qs.length) * 100);
    setCorrect(correctCount);
    setScore(finalScore);
    setPhase('results');

    // Save attempt to backend
    const token = session?.access_token;
    try {
      await axios.post(`${API}/api/quizzes/${id}/submit`, {
        answers: finalAnswers,
        score: finalScore,
        correctCount,
        total: qs.length,
        timeTaken: (qs.length * 45) - timeLeft,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch { /* non-fatal */ }
  };

  /* ── Retry ── */
  const retry = () => {
    setQIndex(0);
    setAnswers({});
    setChosen(null);
    setScore(0);
    setCorrect(0);
    setReview(false);
    setPhase('play');
    setTimeLeft((quiz?.questions?.length || 10) * 45);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Spinner /><p style={{ color: '#64748B', margin: 0 }}>Loading quiz…</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <p style={{ color: '#F87171', fontSize: 16, textAlign: 'center' }}>❌ {error}</p>
      <button onClick={() => navigate('/quizzes')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>← Back to Quizzes</button>
    </div>
  );

  const questions = quiz?.questions || [];
  const passing   = quiz?.passing_score || 70;

  /* ════════════════════════════
     RESULTS SCREEN
  ════════════════════════════ */
  if (phase === 'results') {
    const passed = score >= passing;
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F1F5F9', fontFamily: '-apple-system,sans-serif', padding: '24px 16px', overflowY: 'auto' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Header */}
          <button onClick={() => navigate('/quizzes')}
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 24, padding: 0 }}>
            <FiArrowLeft size={16} /> Back to Quizzes
          </button>

          {/* Score card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#1E293B', borderRadius: 24, border: `2px solid ${passed ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, padding: '36px 28px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: passed ? '#10B981' : '#EF4444', margin: '0 auto 20px', padding: '2px', boxShadow: `0 0 20px ${passed ? '#10B981' : '#EF4444'}` }} />

            {/* Circle score */}
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 24px' }}>
              <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle cx="80" cy="80" r="68" fill="none"
                  stroke={passed ? '#10B981' : '#EF4444'} strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 * (1 - score / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 38, fontWeight: 800, color: passed ? '#10B981' : '#EF4444' }}>{score}%</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: passed ? '#10B981' : '#EF4444', textTransform: 'uppercase', letterSpacing: 1 }}>{passed ? 'PASSED' : 'TRY AGAIN'}</span>
              </div>
            </div>

            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{quiz?.title}</h2>
            <p style={{ margin: '0 0 28px', color: '#64748B', fontSize: 14 }}>{passed ? '🎉 Great work! You passed the quiz.' : `You need ${passing}% to pass. Keep practicing!`}</p>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Correct', value: correct, color: '#10B981' },
                { label: 'Incorrect', value: questions.length - correct, color: '#EF4444' },
                { label: 'Total', value: questions.length, color: '#6366F1' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0F172A', borderRadius: 14, padding: '14px 8px' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setReview(v => !v)}
                style={{ padding: '11px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: review ? 'rgba(99,102,241,0.2)' : 'transparent', color: review ? '#A5B4FC' : '#94A3B8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {review ? '▲ Hide Answers' : '📋 Review Answers'}
              </button>
              <button onClick={retry}
                style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiRefreshCw size={14} /> Try Again
              </button>
            </div>
          </motion.div>

          {/* Answer Review */}
          <AnimatePresence>
            {review && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <h3 style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Answer Review</h3>
                {questions.map((q, qi) => {
                  const userIdx    = answers[qi];
                  const correct    = userIdx === q.correctAnswer;
                  const unanswered = userIdx === null || userIdx === undefined;
                  const opts       = q.options || [];
                  return (
                    <div key={qi} style={{ background: '#1E293B', borderRadius: 16, border: `1px solid ${unanswered ? 'rgba(255,255,255,0.07)' : correct ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, padding: '18px 20px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                        {unanswered ? <span style={{ fontSize: 18 }}>⏭</span>
                          : correct  ? <FiCheckCircle size={18} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                          : <FiXCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                        <p style={{ margin: 0, color: '#E2E8F0', fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                          Q{qi + 1}. {q.question || q.text || `Question ${qi + 1}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}>
                        {opts.map((opt, oi) => {
                          const isCorrect  = oi === q.correctAnswer;
                          const isSelected = oi === userIdx;
                          let bg = 'transparent', color = '#64748B', border = '1px solid rgba(255,255,255,0.06)';
                          if (isCorrect)  { bg = 'rgba(16,185,129,0.12)'; color = '#10B981'; border = '1px solid rgba(16,185,129,0.3)'; }
                          if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; color = '#F87171'; border = '1px solid rgba(239,68,68,0.3)'; }
                          const label = typeof opt === 'string' ? opt : opt?.text || opt?.label || JSON.stringify(opt);
                          return (
                            <div key={oi} style={{ padding: '8px 12px', borderRadius: 10, background: bg, color, border, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}.</span>
                              {label}
                              {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>✓ Correct</span>}
                              {isSelected && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>✗ Your answer</span>}
                            </div>
                          );
                        })}
                        {q.explanation && (
                          <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#A5B4FC', fontSize: 12 }}>
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ════════════════════════════
     PLAY SCREEN
  ════════════════════════════ */
  const q    = questions[qIndex];
  const opts = q?.options || [];
  const pct  = questions.length > 0 ? (qIndex / questions.length) * 100 : 0;
  const isLastQ = qIndex === questions.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F1F5F9', fontFamily: '-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, background: '#0B1120', flexShrink: 0 }}>
        <button onClick={() => navigate('/quizzes')}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: 0 }}>
          <FiArrowLeft size={16} />
        </button>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E2E8F0' }}>{quiz?.title}</p>
        <span style={{ fontSize: 13, color: '#6366F1', fontWeight: 700, flexShrink: 0 }}>{qIndex + 1} / {questions.length}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: timeLeft < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: timeLeft < 60 ? '#F87171' : '#94A3B8', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          <FiClock size={12} /> {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366F1,#10B981)', transition: 'width .3s' }} />
      </div>

      {/* Question */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 16px 100px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            <motion.div key={qIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <p style={{ margin: '0 0 28px', fontSize: 18, fontWeight: 700, lineHeight: 1.6, color: '#F1F5F9', textAlign: 'center' }}>
                {q?.question || q?.text || `Question ${qIndex + 1}`}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {opts.map((opt, oi) => {
                  const label = typeof opt === 'string' ? opt : opt?.text || opt?.label || String(opt);
                  const sel = chosen === oi;
                  return (
                    <button key={oi} onClick={() => select(oi)}
                      style={{ padding: '14px 18px', borderRadius: 14, border: `2px solid ${sel ? '#6366F1' : 'rgba(255,255,255,0.08)'}`, background: sel ? 'rgba(99,102,241,0.15)' : '#1E293B', color: sel ? '#A5B4FC' : '#CBD5E1', fontWeight: sel ? 700 : 500, fontSize: 15, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: 'all .15s', fontFamily: 'inherit' }}>
                      <span style={{ width: 32, height: 32, borderRadius: 9, background: sel ? '#6366F1' : 'rgba(255,255,255,0.08)', color: sel ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0B1120', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button onClick={next} disabled={chosen === null}
          style={{ padding: '12px 32px', borderRadius: 14, border: 'none', background: chosen !== null ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#1E293B', color: chosen !== null ? '#fff' : '#475569', fontWeight: 700, fontSize: 15, cursor: chosen !== null ? 'pointer' : 'not-allowed', transition: 'all .2s', fontFamily: 'inherit' }}>
          {isLastQ ? 'Finish Quiz ✓' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
