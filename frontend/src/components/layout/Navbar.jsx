import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '@/store/authStore';
import useAppStore from '@/store/appStore';
import useAuth from '@/hooks/useAuth';

export default function Navbar({ title = '' }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, profile } = useAuthStore();
  const { toggleSidebar } = useAppStore();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = profile?.firstName 
    ? profile.firstName.charAt(0) 
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-16 bg-[#09090b]/85 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="mr-4 text-gray-400 hover:text-white md:hidden"
        >
          <FiMenu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <FiBell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#09090b]"></span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] flex items-center justify-center text-white font-bold ring-2 ring-transparent hover:ring-[#7c3aed]/50 transition-all focus:outline-none"
          >
            {initials}
          </button>

          <AnimatePresence>
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <motion.div 
                  className="absolute right-0 mt-2 w-48 glass-card bg-[#111117] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">{profile?.firstName || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <FiUser className="mr-2" /> Profile
                    </button>
                    <button 
                      onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <FiSettings className="mr-2" /> Settings
                    </button>
                    <div className="border-t border-white/10 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                    >
                      <FiLogOut className="mr-2" /> Sign Out
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
