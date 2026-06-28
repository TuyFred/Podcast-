import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiGrid, FiFileText, FiHeadphones, FiCheckSquare,
  FiLayers, FiBookOpen, FiUser, FiShield, FiMic,
  FiLogOut, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import useAuthStore from '@/store/authStore';
import useAppStore from '@/store/appStore';

export default function Sidebar() {
  const { user, profile, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const navigate = useNavigate();

  const name    = profile?.first_name || profile?.firstName || user?.email?.split('@')[0] || 'User';
  const email   = user?.email || '';
  const avatar  = name.charAt(0).toUpperCase();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { name: 'Dashboard',  path: '/dashboard',  icon: <FiGrid />,        color: '#2563EB' },
    { name: 'My Notes',   path: '/notes',       icon: <FiFileText />,    color: '#059669' },
    { name: 'AI Studio',  path: '/studio',      icon: <FiMic />,         color: '#7C3AED' },
    { name: 'Podcasts',   path: '/podcasts',    icon: <FiHeadphones />,  color: '#0891B2' },
    { name: 'Quizzes',    path: '/quizzes',     icon: <FiCheckSquare />, color: '#D97706' },
    { name: 'Flashcards', path: '/flashcards',  icon: <FiLayers />,      color: '#DB2777' },
    { name: 'Summaries',  path: '/summaries',   icon: <FiBookOpen />,    color: '#9333EA' },
    { name: 'Profile',    path: '/profile',     icon: <FiUser />,        color: '#374151' },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: <FiShield />, color: '#EF4444' });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <motion.aside
      className="flex flex-col flex-shrink-0 z-50 sticky top-0 h-screen overflow-hidden"
      style={{ background: '#1E3A8A', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      initial={{ width: 240 }}
      animate={{ width: sidebarOpen ? 240 : 68 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#60A5FA,#34D399)' }}>
          <FiMic size={16} className="text-white" />
        </div>
        <motion.span
          className="ml-3 font-bold text-white text-base whitespace-nowrap overflow-hidden"
          animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
          transition={{ duration: 0.2 }}>
          VoiceAI
        </motion.span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-xl transition-all duration-150 group relative overflow-hidden
               ${isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'}`
            }>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <div className={`text-lg flex-shrink-0 relative z-10 transition-colors
                  ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}
                  style={isActive ? { color: item.color === '#374151' ? '#fff' : item.color } : {}}>
                  {item.icon}
                </div>
                <motion.span
                  className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden relative z-10"
                  animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                  transition={{ duration: 0.2 }}>
                  {item.name}
                </motion.span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* User info */}
        {sidebarOpen ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#60A5FA,#34D399)' }}>
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{email}</p>
            </div>
            {isAdmin && (
              <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold flex-shrink-0"
                style={{ background: '#FEF3C7', color: '#92400E' }}>
                Admin
              </span>
            )}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white mx-auto mb-2"
            style={{ background: 'linear-gradient(135deg,#60A5FA,#34D399)' }}>
            {avatar}
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.55)' }}>
          <FiLogOut size={15} />
          <motion.span
            className="whitespace-nowrap overflow-hidden"
            animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
            transition={{ duration: 0.2 }}>
            Sign Out
          </motion.span>
        </button>

        {/* Toggle */}
        <button onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-1.5 mt-1 rounded-xl transition-all hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          {sidebarOpen ? <FiChevronsLeft size={16} /> : <FiChevronsRight size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
