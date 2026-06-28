import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import RegisterForm from '@/components/auth/RegisterForm';

export default function Register() {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#7c3aed]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3b82f6]/10 blur-[120px] pointer-events-none" />
      
        <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] shadow-[0_0_25px_rgba(124,58,237,0.35)] mb-4"
          >
            <span className="text-white font-bold text-2xl">E</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Start your journey</h2>
          <p className="text-gray-400">Create a free account to turn notes into podcasts, quizzes, and flashcards</p>
        </div>
        
        <div className="glass-card bg-[#111117]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
