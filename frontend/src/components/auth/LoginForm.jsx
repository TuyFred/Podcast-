import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiEye, FiEyeOff, FiAlertCircle, FiMail, FiArrowLeft,
  FiCheckCircle, FiLock, FiKey,
} from 'react-icons/fi';
import useAuth from '@/hooks/useAuth';
import useAuthStore from '@/store/authStore';

/**
 * LoginForm — handles:
 *   view = 'login'        → email + password sign-in
 *   view = 'forgot'       → enter email to receive OTP via Brevo
 *   view = 'reset'        → enter OTP + new password to reset
 *   view = 'reset-done'   → success screen
 */
export default function LoginForm({ onSwitchToRegister, light = false }) {
  const [view, setView]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState(null);

  // Forgot / reset state
  const [forgotEmail, setForgotEmail]   = useState('');
  const [resetOtp,    setResetOtp]      = useState(['', '', '', '', '', '']);
  const [newPwd,      setNewPwd]        = useState('');
  const [showNewPwd,  setShowNewPwd]    = useState(false);

  const navigate = useNavigate();
  const { login, forgotPassword, resetPassword, loading } = useAuth();
  const { fetchProfile } = useAuthStore();

  /* ── style tokens ── */
  const lbl    = light ? '#374151' : '#D1D5DB';
  const iBase  = 'w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors';
  const iStyle = light
    ? { background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }
    : { background: '#18181f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };

  const ErrorBox = ({ msg }) => msg ? (
    <div className="p-3 rounded-xl flex items-start gap-2 text-sm mb-3"
      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
      <FiAlertCircle className="mt-0.5 flex-shrink-0" size={14} /><span>{msg}</span>
    </div>
  ) : null;

  const SubmitBtn = ({ disabled: dis, children: ch }) => (
    <button type="submit" disabled={dis || loading}
      className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg,#2563EB,#10B981)',
        boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
        opacity: (dis || loading) ? 0.6 : 1,
      }}>
      {loading
        ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        : ch}
    </button>
  );

  /* ── OTP input helpers ── */
  const handleOtpChange = (i, val) => {
    if (isNaN(val)) return;
    const next = [...resetOtp]; next[i] = val; setResetOtp(next);
    if (val && i < 5) document.getElementById(`rotp-${i + 1}`)?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !resetOtp[i] && i > 0)
      document.getElementById(`rotp-${i - 1}`)?.focus();
  };

  /* ── Login submit ── */
  const handleLogin = async (e) => {
    e.preventDefault(); setError(null);
    const { data, error: err } = await login(email, password);
    if (err) {
      setError(err.message?.includes('Invalid') ? 'Incorrect email or password.' : err.message);
      return;
    }
    if (data?.user) {
      // Navigate immediately — profile loads in background via onAuthStateChange
      // /home will redirect to /admin or /dashboard once profile is ready
      navigate('/home', { replace: true });
    }
  };

  /* ── Forgot: send OTP email ── */
  const handleForgot = async (e) => {
    e.preventDefault(); setError(null);
    const { error: err } = await forgotPassword(forgotEmail);
    if (!err) setView('reset');
    else setError('Failed to send code. Please try again.');
  };

  /* ── Reset: verify OTP + set new password ── */
  const handleReset = async (e) => {
    e.preventDefault(); setError(null);
    const otp = resetOtp.join('');
    if (otp.length !== 6) return setError('Please enter the 6-digit code from your email.');
    if (newPwd.length < 6) return setError('New password must be at least 6 characters.');
    const { error: err } = await resetPassword(forgotEmail, otp, newPwd);
    if (!err) setView('reset-done');
    else setError(err.message);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">

        {/* ══ LOGIN VIEW ══ */}
        {view === 'login' && (
          <motion.div key="login"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <form onSubmit={handleLogin} className="space-y-4">
              <ErrorBox msg={error} />

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: lbl }}>Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: '#9CA3AF' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className={`${iBase} pl-9`} style={iStyle} placeholder="you@example.com" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: lbl }}>Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: '#9CA3AF' }} />
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${iBase} pl-9 pr-10`} style={iStyle} required />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                    style={{ color: '#9CA3AF' }}>
                    {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => { setForgotEmail(email); setError(null); setView('forgot'); }}
                  className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: '#2563EB' }}>
                  Forgot password?
                </button>
              </div>

              <SubmitBtn>Sign In</SubmitBtn>
            </form>

            <p className="mt-4 text-center text-sm" style={{ color: '#6B7280' }}>
              Don't have an account?{' '}
              {onSwitchToRegister ? (
                <button type="button" onClick={onSwitchToRegister}
                  className="font-semibold hover:opacity-80" style={{ color: '#2563EB' }}>
                  Sign up free
                </button>
              ) : (
                <Link to="/register" className="font-semibold hover:opacity-80" style={{ color: '#2563EB' }}>
                  Sign up free
                </Link>
              )}
            </p>
          </motion.div>
        )}

        {/* ══ FORGOT VIEW: enter email ══ */}
        {view === 'forgot' && (
          <motion.div key="forgot"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
                <FiMail size={20} style={{ color: '#2563EB' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: light ? '#111827' : '#fff' }}>Reset your password</h3>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                Enter your email — we'll send a 6-digit code via Brevo.
              </p>
            </div>

            <form onSubmit={handleForgot} className="space-y-4">
              <ErrorBox msg={error} />
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: lbl }}>Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: '#9CA3AF' }} />
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className={`${iBase} pl-9`} style={iStyle} placeholder="you@example.com" required />
                </div>
              </div>
              <SubmitBtn>Send Reset Code 📬</SubmitBtn>
            </form>

            <button type="button" onClick={() => { setError(null); setView('login'); }}
              className="mt-4 text-sm flex items-center justify-center w-full gap-1.5 hover:opacity-80"
              style={{ color: '#6B7280' }}>
              <FiArrowLeft size={13} /> Back to Sign In
            </button>
          </motion.div>
        )}

        {/* ══ RESET VIEW: enter OTP + new password ══ */}
        {view === 'reset' && (
          <motion.div key="reset"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: '#EFF6FF', border: '2px solid #BFDBFE' }}>
                <FiKey size={20} style={{ color: '#2563EB' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: light ? '#111827' : '#fff' }}>Enter the code</h3>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                We sent a 6-digit code to{' '}
                <span className="font-semibold" style={{ color: light ? '#111827' : '#e5e7eb' }}>{forgotEmail}</span>
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <ErrorBox msg={error} />

              {/* OTP inputs */}
              <div className="flex justify-between gap-2">
                {resetOtp.map((d, i) => (
                  <input key={i} id={`rotp-${i}`} type="text" maxLength="1" value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className="w-10 text-center text-lg font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                    style={{
                      height: 48,
                      background: light ? '#F9FAFB' : '#18181f',
                      border: d ? '2px solid #2563EB' : `1.5px solid ${light ? '#E5E7EB' : 'rgba(255,255,255,0.1)'}`,
                      color: light ? '#111827' : '#fff',
                    }}
                  />
                ))}
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: lbl }}>New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: '#9CA3AF' }} />
                  <input type={showNewPwd ? 'text' : 'password'} value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className={`${iBase} pl-9 pr-10`} style={iStyle}
                    placeholder="Min 6 characters" required />
                  <button type="button" onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                    style={{ color: '#9CA3AF' }}>
                    {showNewPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>

              <SubmitBtn disabled={resetOtp.join('').length !== 6}>Reset Password 🔒</SubmitBtn>
            </form>

            <div className="mt-3 flex flex-col items-center gap-1.5">
              <button type="button" onClick={handleForgot}
                className="text-xs font-semibold hover:opacity-80" style={{ color: '#2563EB' }}>
                Didn't receive it? Resend code
              </button>
              <button type="button" onClick={() => { setError(null); setView('forgot'); }}
                className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: '#6B7280' }}>
                <FiArrowLeft size={11} /> Change email
              </button>
            </div>
          </motion.div>
        )}

        {/* ══ RESET DONE ══ */}
        {view === 'reset-done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#ECFDF5', border: '2px solid #A7F3D0' }}>
                <FiCheckCircle size={28} style={{ color: '#059669' }} />
              </div>
              <h3 className="font-bold text-xl mb-2" style={{ color: light ? '#111827' : '#fff' }}>
                Password reset! 🎉
              </h3>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                Your password has been updated successfully. You can now sign in.
              </p>
              <button type="button"
                onClick={() => { setView('login'); setPassword(''); setResetOtp(['','','','','','']); setNewPwd(''); }}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#2563EB,#10B981)' }}>
                Sign In Now
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
