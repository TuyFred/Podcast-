import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/layout/Layout';

/* ── Lazy-loaded pages ───────────────────────── */
const LandingPage      = React.lazy(() => import('@/pages/LandingPage'));
const Login            = React.lazy(() => import('@/pages/auth/Login'));
const Register         = React.lazy(() => import('@/pages/auth/Register'));
const ForgotPassword   = React.lazy(() => import('@/pages/auth/ForgotPassword'));
const StudentDashboard = React.lazy(() => import('@/pages/dashboard/StudentDashboard'));
const NotesPage        = React.lazy(() => import('@/pages/notes/NotesPage'));
const NoteDetailPage   = React.lazy(() => import('@/pages/notes/NoteDetailPage'));
const StudioPage       = React.lazy(() => import('@/pages/podcasts/StudioPage'));
const PodcastsPage     = React.lazy(() => import('@/pages/podcasts/PodcastsPage'));
const QuizzesPage      = React.lazy(() => import('@/pages/quizzes/QuizzesPage'));
const QuizPlayPage     = React.lazy(() => import('@/pages/quizzes/QuizPlayPage'));
const FlashcardsPage   = React.lazy(() => import('@/pages/flashcards/FlashcardsPage'));
const SummariesPage    = React.lazy(() => import('@/pages/summaries/SummariesPage'));
const ProfilePage      = React.lazy(() => import('@/pages/profile/ProfilePage'));
const TTSPage          = React.lazy(() => import('@/pages/tts/TTSPage'));
const AdminPage        = React.lazy(() => import('@/pages/admin/AdminPage'));

/* ── Full-screen loading ─────────────────────── */
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0F172A' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2"
              stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#6366F1', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Route guards ────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, profile, initialized } = useAuthStore();
  if (!initialized) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (profile && profile.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

/* ── Smart dashboard redirect — admin → /admin, student → /dashboard ── */
function DashboardRedirect() {
  const { user, profile, initialized } = useAuthStore();
  if (!initialized) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

/* ── App ─────────────────────────────────────── */
export default function App() {
  const { initialize } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ──────────────────── */}
        <Route path="/"                element={<LandingPage />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Smart redirect after login ─────── */}
        <Route path="/home" element={<DashboardRedirect />} />

        {/* ── Student Dashboard (own full-page layout, no Layout wrapper) ── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><StudentDashboard /></ProtectedRoute>
        } />

        {/* ── Pages with sidebar Layout ── */}
        <Route path="/notes"      element={<ProtectedRoute><Layout title="My Notes"><NotesPage /></Layout></ProtectedRoute>} />
        <Route path="/quizzes"    element={<ProtectedRoute><Layout title="Quizzes"><QuizzesPage /></Layout></ProtectedRoute>} />
        <Route path="/quizzes/:id/play" element={<ProtectedRoute><Layout title="Quiz"><QuizPlayPage /></Layout></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute><Layout title="Flashcards"><FlashcardsPage /></Layout></ProtectedRoute>} />
        <Route path="/summaries"  element={<ProtectedRoute><Layout title="Summaries"><SummariesPage /></Layout></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><Layout title="Profile"><ProfilePage /></Layout></ProtectedRoute>} />

        {/* ── Pages with sidebar ── */}
        <Route path="/studio"     element={<Navigate to="/tts" replace />} />
        <Route path="/tts"        element={<ProtectedRoute><Layout title="Text to Speech"><TTSPage /></Layout></ProtectedRoute>} />
        <Route path="/podcasts"   element={<ProtectedRoute><Layout title="Audio Library"><PodcastsPage /></Layout></ProtectedRoute>} />
        <Route path="/notes/:id"  element={<ProtectedRoute><Layout title="Note Detail"><NoteDetailPage /></Layout></ProtectedRoute>} />

        {/* ── Admin Panel (admin only) ────────── */}
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
