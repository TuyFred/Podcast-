import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiMail, FiLock } from 'react-icons/fi';
import Button from '../ui/Button';
import useAuth from '@/hooks/useAuth';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  
  const { forgotPassword, verifyOtp, updatePassword, loading } = useAuth();
  const navigate = useNavigate();

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { error: resetError } = await forgotPassword(email);
      if (!resetError) {
        setStep(2);
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError(null);
    
    const token = otp.join('');
    if (token.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // 1. Verify OTP
      const { error: verifyError } = await verifyOtp(email, token, 'recovery');
      if (verifyError) throw verifyError;
      
      // 2. Update Password
      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) throw updateError;
      
      // Success
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="w-full relative min-h-[350px]">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleRequestReset} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/20 rounded-lg flex items-start text-red-500">
                  <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Enter your email address and we'll send you a 6-digit verification code to reset your password.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6 py-3" 
                loading={loading}
              >
                Send Reset Code
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <Link to="/login" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                <FiArrowLeft className="mr-2" /> Back to login
              </Link>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col pt-2"
          >
            <p className="text-sm text-gray-400 mb-6 text-center">
              We sent a code to <span className="text-white font-medium">{email}</span>. Enter it below along with your new password.
            </p>

            <form onSubmit={handleVerifyAndReset} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/20 rounded-lg flex items-start text-red-500">
                  <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">6-Digit Reset Code</label>
                <div className="flex justify-between space-x-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`reset-otp-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 bg-[#18181f] border border-white/10 rounded-xl text-center text-xl text-white font-bold focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#18181f] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-4 py-3" 
                loading={loading}
                disabled={otp.join('').length !== 6}
              >
                Reset Password
              </Button>
              
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center w-full mt-4"
              >
                <FiArrowLeft className="mr-2" /> Start over
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
