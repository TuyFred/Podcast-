import React from 'react';
import { Link } from 'react-router-dom';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-[#7c3aed]/10 rounded-full blur-[100px]" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] shadow-[0_0_25px_rgba(124,58,237,0.35)] mb-4"
          >
            <span className="text-white font-bold text-2xl">E</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Reset password</h2>
          <p className="text-gray-400">We’ll send you instructions in email</p>
        </div>

        
        <div className="glass-card bg-[#111117]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
