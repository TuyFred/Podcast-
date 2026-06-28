import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  FiUpload, FiHeadphones, FiZap, FiVolume2, FiBookOpen,
  FiCheck, FiX, FiMenu, FiMic, FiPlay, FiStar,
  FiArrowRight, FiFileText, FiClock, FiGlobe, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import useAuthStore from '@/store/authStore';

/* ─────────────────────────── COLOUR TOKENS ───────────────────────────
  Background  : #F5F5F5  (whitesmoke)
  Surface     : #FFFFFF  (white cards)
  Primary blue: #2563EB
  Blue light  : #EFF6FF
  Blue border : #BFDBFE
  Green accent: #10B981
  Green light : #ECFDF5
  Text dark   : #111827
  Text medium : #4B5563
  Text light  : #9CA3AF
  Border      : #E5E7EB
──────────────────────────────────────────────────────────────────────── */

/* ── Slide images: real Unsplash photos of people using tech/audio ── */
const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80',
    caption: 'Students learning with AI-powered audio',
  },
  {
    url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=900&q=80',
    caption: 'Listen to your notes anywhere, any time',
  },
  {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
    caption: 'Turn any document into a podcast in seconds',
  },
  {
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80',
    caption: 'Collaborate and learn smarter as a team',
  },
];

/* ─────────────────────── IMAGE SLIDER ─────────────────────── */
function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback((idx) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [next]);

  const variants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ aspectRatio: '16/10', background: '#EFF6FF' }}>

      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={current}
          src={SLIDES[current].url}
          alt={SLIDES[current].caption}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Caption */}
      <AnimatePresence mode="wait">
        <motion.p
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-4 left-5 right-16 text-white text-sm font-medium"
        >
          {SLIDES[current].caption}
        </motion.p>
      </AnimatePresence>

      {/* Prev / Next */}
      <button onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-all">
        <FiChevronLeft size={16} />
      </button>
      <button onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow transition-all">
        <FiChevronRight size={16} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── AUTH MODAL ─────────────────────── */
function AuthModal({ mode, onClose, onSwitch }) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                  <FiMic className="text-white" size={14} />
                </div>
                <span className="font-bold text-lg" style={{ color: '#111827' }}>VoiceAI</span>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: '#9CA3AF' }}>
                <FiX size={18} />
              </button>
            </div>

            {/* Title */}
            <div className="px-6 pt-3 pb-2">
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {mode === 'login'
                  ? 'Sign in to continue turning text into audio'
                  : 'Start free — no credit card required'}
              </p>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 pb-1 flex gap-1" style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['login', 'register'].map((tab) => (
                <button key={tab} onClick={() => onSwitch(tab)}
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                  style={mode === tab
                    ? { background: '#2563EB', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }
                    : { color: '#6B7280' }}>
                  {tab === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="px-6 py-5">
              {mode === 'login'
                ? <LoginForm onSwitchToRegister={() => onSwitch('register')} light />
                : <RegisterForm onSwitchToLogin={() => onSwitch('login')} light />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────── SMALL HELPERS ─────────────────────── */
const SectionDivider = () => (
  <div style={{ height: 1, background: '#E5E7EB', margin: '0 auto', maxWidth: '1200px' }} />
);

/* ── All 6 feature cards use the same dark-blue gradient ── */
function FeatureCard({ icon, title, desc, index = 0 }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="rounded-2xl p-6 cursor-default"
      style={{
        background: 'linear-gradient(145deg, #1E3A8A, #1D4ED8)',
        boxShadow: '0 8px 30px rgba(30,58,138,0.25)',
      }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        <span style={{ color: '#FFFFFF', fontSize: 22 }}>{icon}</span>
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: '#FFFFFF' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{desc}</p>
    </motion.div>
  );
}

/* ─────────────────────── MAIN PAGE ─────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [authModal, setAuthModal] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const openModal = (mode) => {
    if (user) {
      navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
      return;
    }
    setAuthModal(mode);
  };

  const features = [
    { icon: <FiUpload />,    title: 'Upload Any Document',  desc: 'PDF, DOCX, TXT — drag and drop or paste text directly. Up to 50MB.' },
    { icon: <FiVolume2 />,   title: 'Studio-Quality Voices', desc: '50+ natural AI voices with human-level intonation and emotion.' },
    { icon: <FiZap />,       title: 'Instant Conversion',    desc: 'Thousands of words converted to polished audio in seconds.' },
    { icon: <FiHeadphones />,title: 'Listen Anywhere',       desc: 'Download MP3 or stream in-app. Offline support included.' },
    { icon: <FiBookOpen />,  title: 'Quizzes & Flashcards',  desc: 'Auto-generate quizzes and spaced-repetition flashcards from any document.' },
    { icon: <FiGlobe />,     title: '30+ Languages',         desc: 'Convert and listen in your language with native-quality pronunciation.' },
  ];

  const steps = [
    { num: '01', icon: <FiFileText size={22} />, title: 'Upload your text', desc: 'Paste content or upload a PDF, DOCX, or TXT file.' },
    { num: '02', icon: <FiZap size={22} />, title: 'AI processes it', desc: 'Our engine extracts key content and builds a natural script.' },
    { num: '03', icon: <FiHeadphones size={22} />, title: 'Listen & learn', desc: 'Stream or download studio-quality audio on any device.' },
  ];

  const testimonials = [
    { name: 'Sarah K.', role: 'Medical Student', stars: 5, text: 'I convert all my lecture notes to audio and listen while commuting. My retention improved dramatically!' },
    { name: 'James T.', role: 'Content Writer', stars: 5, text: 'VoiceAI saves me hours every week. I can proofread articles by ear — catches errors I always miss reading.' },
    { name: 'Amina R.', role: 'Software Engineer', stars: 5, text: 'The voice quality is unreal. It handles complex technical terminology perfectly.' },
  ];

  const plans = [
    {
      name: 'Free', price: '$0', period: 'forever',
      desc: 'Perfect for trying out VoiceAI',
      features: ['10,000 characters / month', '3 AI voices', 'MP3 download', 'Basic summaries'],
      cta: 'Get Started Free', highlight: false,
    },
    {
      name: 'Pro', price: '$12', period: 'per month',
      desc: 'For serious learners and creators',
      features: ['Unlimited characters', '50+ premium voices', 'Multi-language', 'Smart quizzes & flashcards', 'Priority processing', 'API access'],
      cta: 'Start Free Trial', highlight: true,
    },
    {
      name: 'Team', price: '$39', period: 'per month',
      desc: 'For teams and organizations',
      features: ['Everything in Pro', 'Up to 10 members', 'Shared workspace', 'Usage analytics', 'Dedicated support'],
      cta: 'Contact Sales', highlight: false,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5', color: '#111827', fontFamily: 'Inter,sans-serif' }}>
      <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitch={setAuthModal} />

      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-50"
        style={{ background: 'rgba(245,245,245,0.92)', borderBottom: '1px solid #E5E7EB', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
              <FiMic className="text-white" size={16} />
            </div>
            <span className="text-xl font-bold" style={{ color: '#111827' }}>VoiceAI</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: '#4B5563' }}>
            {['features', 'how-it-works', 'pricing', 'testimonials'].map(id => (
              <a key={id} href={`#${id}`}
                className="hover:text-blue-600 transition-colors capitalize"
                style={{ color: '#4B5563' }}>
                {id.replace('-', ' ')}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => openModal('login')}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all hover:bg-blue-50"
              style={{ color: '#2563EB', border: '1px solid #BFDBFE' }}>
              Log in
            </button>
            <button onClick={() => openModal('register')}
              className="text-sm font-semibold px-5 py-2 rounded-xl text-white transition-all hover:opacity-90 shadow-md"
              style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              Start for free
            </button>
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#4B5563' }}
            onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden" style={{ borderTop: '1px solid #E5E7EB', background: '#FFFFFF' }}>
              <div className="px-6 py-4 flex flex-col gap-3 text-sm">
                {['features', 'how-it-works', 'pricing', 'testimonials'].map(id => (
                  <a key={id} href={`#${id}`} className="capitalize py-1 transition-colors hover:text-blue-600"
                    style={{ color: '#4B5563' }} onClick={() => setMobileMenu(false)}>
                    {id.replace('-', ' ')}
                  </a>
                ))}
                <div className="pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <button onClick={() => { openModal('login'); setMobileMenu(false); }}
                    className="py-2.5 rounded-xl font-medium transition-all"
                    style={{ border: '1px solid #BFDBFE', color: '#2563EB', background: '#EFF6FF' }}>
                    Log in
                  </button>
                  <button onClick={() => { openModal('register'); setMobileMenu(false); }}
                    className="py-2.5 rounded-xl font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                    Start for free
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          {/* Left: text */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI-Powered Text to Audio
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-5"
              style={{ color: '#111827' }}>
              Turn any text into
              <span className="block" style={{
                background: 'linear-gradient(135deg,#2563EB,#10B981)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                studio-quality audio
              </span>
            </h1>

            <p className="text-lg leading-relaxed mb-8" style={{ color: '#4B5563' }}>
              Upload your notes, articles, or documents and let our AI convert them into
              natural-sounding podcasts you can listen to anywhere — in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <button onClick={() => openModal('register')}
                className="flex items-center justify-center gap-2 font-semibold text-base px-7 py-3.5 rounded-xl text-white transition-all hover:opacity-90 shadow-lg"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
                Get started — it's free <FiArrowRight />
              </button>
              <button onClick={() => openModal('login')}
                className="flex items-center justify-center gap-2 font-medium text-base px-7 py-3.5 rounded-xl transition-all hover:bg-blue-50"
                style={{ border: '1.5px solid #BFDBFE', color: '#2563EB', background: '#FFFFFF' }}>
                <FiPlay size={15} /> See demo
              </button>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-6">
              {[
                { v: '500K+', l: 'Documents converted' },
                { v: '50+',   l: 'AI voices' },
                { v: '30+',   l: 'Languages', green: true },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold" style={{ color: s.green ? '#10B981' : '#2563EB' }}>{s.v}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: image slider */}
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <HeroSlider />

            {/* Floating audio card */}
            <div className="mt-4 rounded-2xl p-4 flex items-center gap-3 shadow-lg"
              style={{ background: '#FFFFFF', border: '1px solid #BFDBFE' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                <FiHeadphones className="text-white" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>Machine Learning Notes.pdf</p>
                <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                  <div className="h-full w-[42%] rounded-full"
                    style={{ background: 'linear-gradient(90deg,#2563EB,#10B981)' }} />
                </div>
              </div>
              <div className="flex items-end gap-px flex-shrink-0">
                {[3,5,8,6,10,7,9,5,8,6,4,7].map((h, i) => (
                  <div key={i} className="w-0.5 rounded-full"
                    style={{ height: h * 2.5, background: i < 7 ? '#2563EB' : '#BFDBFE' }} />
                ))}
              </div>
              <span className="text-xs font-medium flex-shrink-0" style={{ color: '#9CA3AF' }}>4:47</span>
            </div>
          </motion.div>
        </div>

        {/* Stats banner */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10"
          style={{ borderTop: '1px solid #E5E7EB' }}>
          {[
            { value: '500K+', label: 'Documents converted' },
            { value: '1M+',   label: 'Audio minutes served' },
            { value: '30+',   label: 'Languages supported' },
            { value: '99%',   label: 'User satisfaction', green: true },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: s.green ? '#10B981' : '#2563EB' }}>{s.value}</div>
              <div className="text-sm" style={{ color: '#9CA3AF' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* ══ FEATURE SECTION 1 ══ */}
      <section className="py-24 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#2563EB' }}>Upload & Convert</div>
            <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ color: '#111827' }}>
              Upload any document,<br />get instant audio
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: '#4B5563' }}>
              Whether it's a 200-page PDF textbook or a short article, VoiceAI converts it to
              natural flowing audio in under a minute. Supports PDF, DOCX, TXT, and direct paste.
            </p>
            <ul className="space-y-3">
              {['PDF, DOCX, TXT support', 'Drag-and-drop upload', 'Batch up to 10 files', 'Preserves structure & headings'].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#374151' }}>
                  <FiCheck style={{ color: '#10B981', flexShrink: 0 }} size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Upload mockup — dark blue card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55 }}
            className="rounded-2xl p-6 shadow-xl"
            style={{ background: 'linear-gradient(145deg,#1E3A8A,#1D4ED8)', boxShadow: '0 12px 40px rgba(30,58,138,0.35)' }}
          >
            {/* Traffic-light dots */}
            <div className="flex gap-1.5 mb-5">
              {['#EF4444','#F59E0B','#4ADE80'].map(c => (
                <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            {/* Drop zone */}
            <div className="rounded-xl p-7 text-center mb-4 cursor-pointer transition-all hover:bg-white/10"
              style={{ border: '2px dashed rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <FiUpload size={24} style={{ color: '#FFFFFF' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Drop your file here</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>PDF, DOCX, TXT — up to 50MB</p>
            </div>
            {/* File list */}
            {['Research_Paper.pdf', 'Lecture_Notes.docx'].map(f => (
              <div key={f} className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-2 transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <FiFileText style={{ color: '#93C5FD' }} size={16} />
                <span className="text-sm flex-1" style={{ color: '#DBEAFE' }}>{f}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#4ADE80', color: '#14532D' }}>✓ Ready</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ FEATURE SECTION 2 ══ */}
      <section className="py-24 px-6" style={{ background: '#F5F5F5' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Voice picker mockup — green card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55 }}
            className="order-2 md:order-1 rounded-2xl p-6 shadow-xl"
            style={{ background: 'linear-gradient(145deg,#065F46,#059669)', boxShadow: '0 12px 40px rgba(5,150,105,0.3)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: 'rgba(255,255,255,0.6)' }}>Choose a voice</p>
            {[
              { name: 'Nova',  desc: 'Clear & professional',  badge: 'Popular', active: true },
              { name: 'Echo',  desc: 'Warm & conversational', badge: '' },
              { name: 'Aria',  desc: 'Energetic & engaging',  badge: 'New' },
            ].map(v => (
              <motion.div key={v.name}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all"
                style={v.active
                  ? { background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)' }
                  : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid transparent' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <FiMic size={17} style={{ color: '#FFFFFF' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{v.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{v.desc}</p>
                </div>
                {v.badge && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>{v.badge}</span>
                )}
              </motion.div>
            ))}
            {/* Audio waveform preview */}
            <div className="mt-4 pt-4 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              {[3,6,9,7,11,8,10,6,9,7,5,8,10,7,4,6,9,8,6,5].map((h, i) => (
                <div key={i} className="rounded-full flex-1"
                  style={{ height: h * 2.8, background: i < 12 ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </motion.div>
          <div className="order-1 md:order-2">
            <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#10B981' }}>AI Voices</div>
            <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ color: '#111827' }}>
              Studio-quality audio<br />on every conversion
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: '#4B5563' }}>
              Forget robotic text-to-speech. VoiceAI uses the latest neural voice models to deliver
              human-level intonation, natural pauses, and emotional clarity.
            </p>
            <ul className="space-y-3">
              {['50+ natural AI voices', 'Adjustable speed & pitch', 'Background music options', '256kbps studio audio'].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#374151' }}>
                  <FiCheck style={{ color: '#2563EB', flexShrink: 0 }} size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ FEATURE SECTION 3 ══ */}
      <section className="py-24 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#2563EB' }}>Listen Anywhere</div>
            <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ color: '#111827' }}>
              Learn on your terms,<br />wherever you are
            </h2>
            <p className="text-lg leading-relaxed mb-6" style={{ color: '#4B5563' }}>
              Turn your commute, gym session, or walk into productive learning time with
              downloadable MP3 audio files that work on any device.
            </p>
            <ul className="space-y-3">
              {['Download as MP3 instantly', 'Stream in-app from any device', 'Saves your listening position', 'Offline playback support'].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#374151' }}>
                  <FiCheck style={{ color: '#10B981', flexShrink: 0 }} size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Library mockup — green card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55 }}
            className="rounded-2xl p-6 shadow-xl"
            style={{ background: 'linear-gradient(145deg,#065F46,#059669)', boxShadow: '0 12px 40px rgba(5,150,105,0.3)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: 'rgba(255,255,255,0.6)' }}>Your library</p>
            {[
              { title: 'Advanced Machine Learning', dur: '18 min', prog: 72 },
              { title: 'Organic Chemistry Ch. 7',   dur: '9 min',  prog: 100 },
              { title: 'History of Modern Europe',  dur: '24 min', prog: 15 },
            ].map((item, idx) => (
              <motion.div key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + idx * 0.1 }}
                whileHover={{ x: 4 }}
                className="p-3 rounded-xl mb-2 cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <FiHeadphones style={{ color: '#FFFFFF' }} size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>{item.title}</p>
                    <p className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <FiClock size={10} /> {item.dur}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={item.prog === 100
                      ? { background: '#4ADE80', color: '#14532D' }
                      : { background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}>
                    {item.prog === 100 ? '✓ Done' : `${item.prog}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.prog}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + idx * 0.15, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: item.prog === 100 ? '#4ADE80' : '#FFFFFF' }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ ALL FEATURES GRID ══ */}
      <section id="features" className="py-24 px-6" style={{ background: '#F5F5F5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#2563EB' }}>Everything included</div>
            <h2 className="text-4xl font-bold mb-3" style={{ color: '#111827' }}>All the tools you need</h2>
            <p className="max-w-xl mx-auto" style={{ color: '#6B7280' }}>From conversion to comprehension — VoiceAI is a complete learning toolkit.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#10B981' }}>Simple process</div>
            <h2 className="text-4xl font-bold mb-3" style={{ color: '#111827' }}>Three steps to audio</h2>
            <p style={{ color: '#6B7280' }}>From document to audio in under 60 seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px z-0"
              style={{ background: 'linear-gradient(90deg,transparent,#BFDBFE,transparent)' }} />
            {steps.map((step, i) => (
              <div key={i} className="relative z-10 text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-lg"
                  style={{ background: '#FFFFFF', border: '3px solid #BFDBFE' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                    {step.icon}
                  </div>
                </div>
                <span className="text-xs font-bold mb-1" style={{ color: '#2563EB', letterSpacing: '0.1em' }}>{step.num}</span>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ TESTIMONIALS ══ */}
      <section id="testimonials" className="py-24 px-6" style={{ background: '#F5F5F5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#2563EB' }}>Loved by learners</div>
            <h2 className="text-4xl font-bold" style={{ color: '#111827' }}>What our users say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                style={{ background: '#FFFFFF', border: '1px solid #BFDBFE' }}>
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <FiStar key={j} size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#4B5563' }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ PRICING ══ */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#10B981' }}>Pricing</div>
            <h2 className="text-4xl font-bold mb-3" style={{ color: '#111827' }}>Simple, transparent pricing</h2>
            <p style={{ color: '#6B7280' }}>Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div key={i} className="rounded-2xl p-7 relative transition-shadow hover:shadow-lg"
                style={plan.highlight
                  ? { background: '#EFF6FF', border: '2px solid #2563EB', boxShadow: '0 8px 30px rgba(37,99,235,0.15)' }
                  : { background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1" style={{ color: '#111827' }}>{plan.name}</h3>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{plan.desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold" style={{ color: '#111827' }}>{plan.price}</span>
                  <span className="text-sm mb-1" style={{ color: '#9CA3AF' }}>/{plan.period}</span>
                </div>
                <button onClick={() => openModal('register')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all mb-6"
                  style={plan.highlight
                    ? { background: '#2563EB', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }
                    : { border: '1.5px solid #BFDBFE', color: '#2563EB', background: '#FFFFFF' }}>
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm" style={{ color: '#374151' }}>
                      <FiCheck style={{ color: plan.highlight ? '#2563EB' : '#10B981', flexShrink: 0 }} size={14} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ══ FINAL CTA ══ */}
      <section className="py-24 px-6" style={{ background: '#EFF6FF' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight" style={{ color: '#111827' }}>
            Start turning text into audio<br />
            <span style={{
              background: 'linear-gradient(135deg,#2563EB,#10B981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              today — for free
            </span>
          </h2>
          <p className="text-lg mb-10" style={{ color: '#4B5563' }}>
            Join thousands of students, writers, and professionals who learn smarter with VoiceAI.
          </p>
          <button onClick={() => openModal('register')}
            className="inline-flex items-center gap-2 font-semibold text-lg px-10 py-4 rounded-xl text-white transition-all hover:opacity-90 shadow-xl"
            style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 10px 30px rgba(37,99,235,0.35)' }}>
            Get started — it's free <FiArrowRight />
          </button>
          <p className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>No credit card required · Free plan available forever</p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-12 px-6" style={{ background: '#F5F5F5', borderTop: '1px solid #E5E7EB' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                  <FiMic className="text-white" size={14} />
                </div>
                <span className="font-bold text-lg" style={{ color: '#111827' }}>VoiceAI</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                The easiest way to convert text to natural-sounding audio. Learn faster, anywhere.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              {[
                { heading: 'Product', links: ['Features', 'Pricing', 'API', "What's New"] },
                { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                { heading: 'Legal',   links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
              ].map(col => (
                <div key={col.heading}>
                  <p className="font-semibold mb-3" style={{ color: '#111827' }}>{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l}>
                        <a href="#" className="transition-colors hover:text-blue-600" style={{ color: '#6B7280' }}>{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 text-xs"
            style={{ borderTop: '1px solid #E5E7EB', color: '#9CA3AF' }}>
            <span>© 2026 VoiceAI Inc. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-blue-600 transition-colors">Help Center</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Status</a>
              <button onClick={() => openModal('login')} className="hover:text-blue-600 transition-colors" style={{ color: '#4B5563', fontWeight: 500 }}>Log in</button>
              <button onClick={() => openModal('register')} className="font-semibold transition-colors hover:opacity-80" style={{ color: '#2563EB' }}>Sign up free</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
