import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiFileText, FiHeadphones, FiCheckSquare,
  FiLayers, FiBookOpen, FiUser, FiShield, FiMic,
  FiLogOut, FiChevronLeft, FiChevronRight,
  FiBell, FiMenu, FiX, FiSearch, FiSettings,
} from 'react-icons/fi';
import useAuthStore from '@/store/authStore';

/* ─── nav items ────────────────────────────── */
const NAV = [
  { label: 'Dashboard',    path: '/dashboard',  icon: FiGrid,        color: '#2563EB' },
  { label: 'My Notes',     path: '/notes',       icon: FiFileText,    color: '#059669' },
  { label: 'Text to Speech', path: '/tts',       icon: FiMic,         color: '#7C3AED' },
  { label: 'Audio Library', path: '/podcasts',   icon: FiHeadphones,  color: '#F59E0B' },
  { label: 'Quizzes',      path: '/quizzes',     icon: FiCheckSquare, color: '#D97706' },
  { label: 'Flashcards',   path: '/flashcards',  icon: FiLayers,      color: '#DB2777' },
  { label: 'Summaries',    path: '/summaries',   icon: FiBookOpen,    color: '#9333EA' },
];

const BOTTOM_NAV = [
  { label: 'Profile',    path: '/profile',     icon: FiUser,        color: '#374151' },
  { label: 'Settings',   path: '/profile',     icon: FiSettings,    color: '#374151' },
];

/* ─── Sidebar ───────────────────────────────── */
function Sidebar({ collapsed, onToggle }) {
  const { user, profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin  = profile?.role === 'admin';
  const name     = profile?.first_name || profile?.firstName || user?.email?.split('@')[0] || 'User';
  const avatar   = name.charAt(0).toUpperCase();

  const allNav = isAdmin
    ? [...NAV, { label: 'Admin Panel', path: '/admin', icon: FiShield, color: '#EF4444' }]
    : NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-screen flex-shrink-0 overflow-hidden"
      style={{ background: '#0F172A', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="flex items-center h-16 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
          <FiMic size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="ml-3 font-bold text-white text-base whitespace-nowrap">
              VoiceAI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
        style={{ scrollbarWidth: 'none' }}>
        {allNav.map(({ label, path, icon: Icon, color }) => (
          <NavLink key={path} to={path}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group
               ${isActive ? 'text-white' : 'text-white/40 hover:text-white/75 hover:bg-white/5'}`
            }>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.09)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                )}
                <div className="relative z-10 w-5 h-5 flex items-center justify-center flex-shrink-0"
                  style={isActive ? { color } : {}}>
                  <Icon size={18} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="relative z-10 text-sm font-medium whitespace-nowrap">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Active dot for collapsed mode */}
                {collapsed && (
                  <NavLink to={path}>
                    {({ isActive }) => isActive && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ background: color }} />
                    )}
                  </NavLink>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-3 mx-3" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

        {/* Bottom nav items */}
        {BOTTOM_NAV.map(({ label, path, icon: Icon, color }) => (
          <NavLink key={label} to={path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-white/40 hover:text-white/75 hover:bg-white/5">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Icon size={17} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-sm font-medium whitespace-nowrap">{label}</motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="flex-shrink-0 p-3 space-y-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {isAdmin ? '⭐ Admin' : user?.email}
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
              {avatar}
            </div>
          </div>
        )}

        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <FiLogOut size={15} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm whitespace-nowrap">Sign Out</motion.span>
            )}
          </AnimatePresence>
        </button>

        <button onClick={onToggle}
          className="w-full flex items-center justify-center py-1.5 rounded-xl transition-all hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.25)' }}>
          {collapsed ? <FiChevronRight size={15} /> : <FiChevronLeft size={15} />}
        </button>
      </div>
    </motion.aside>
  );
}

/* ─── Top Navbar ────────────────────────────── */
function Topbar({ title, onMobileMenu }) {
  const { user, profile, logout } = useAuthStore();
  const [dropdown, setDropdown] = useState(false);
  const navigate = useNavigate();
  const name   = profile?.first_name || profile?.firstName || user?.email?.split('@')[0] || 'User';
  const avatar = name.charAt(0).toUpperCase();

  return (
    <header className="h-14 flex items-center justify-between px-5 flex-shrink-0"
      style={{ background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: '#64748B' }} onClick={onMobileMenu}>
          <FiMenu size={20} />
        </button>
        <h1 className="text-base font-bold" style={{ color: '#F1F5F9' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <FiSearch size={13} style={{ color: '#64748B' }} />
          <span className="text-xs" style={{ color: '#64748B' }}>Search…</span>
        </div>

        {/* Bell */}
        <button className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: '#94A3B8' }}>
          <FiBell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#EF4444' }} />
        </button>

        {/* Avatar dropdown */}
        <div className="relative">
          <button onClick={() => setDropdown(v => !v)}
            className="w-8 h-8 rounded-full font-bold text-sm text-white flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
            {avatar}
          </button>

          <AnimatePresence>
            {dropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{name}</p>
                    <p className="text-xs truncate" style={{ color: '#64748B' }}>{user?.email}</p>
                  </div>
                  <div className="py-1.5">
                    {[
                      { label: 'Profile', icon: FiUser, path: '/profile' },
                      { label: 'Settings', icon: FiSettings, path: '/profile' },
                    ].map(({ label, icon: Icon, path }) => (
                      <button key={label}
                        onClick={() => { navigate(path); setDropdown(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-white/10"
                        style={{ color: '#CBD5E1' }}>
                        <Icon size={14} style={{ color: '#64748B' }} /> {label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 12px' }} />
                    <button
                      onClick={async () => { setDropdown(false); await logout(); navigate('/'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-red-900/30"
                      style={{ color: '#EF4444' }}>
                      <FiLogOut size={14} /> Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

/* ─── Mobile overlay sidebar ──────────────────── */
function MobileSidebar({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose} />
          <motion.div
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <Sidebar collapsed={false} onToggle={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main Layout ───────────────────────────── */
export default function Layout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile menu on navigate
  React.useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B1220' }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} onMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: '#0B1220' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ minHeight: '100%', padding: 'clamp(12px, 4vw, 24px)' }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
