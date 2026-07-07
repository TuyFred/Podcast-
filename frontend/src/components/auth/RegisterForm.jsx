import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiEyeOff, FiAlertCircle, FiArrowRight, FiArrowLeft, FiMail } from 'react-icons/fi';
import useAuth from '@/hooks/useAuth';

/* light=true  → used inside the landing-page modal
   light=false → used on the standalone /register page  */
export default function RegisterForm({ onSwitchToLogin, light = false, onVerified }) {
  const [step, setStep] = useState(1);
  const [emailSent, setEmailSent] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', educationLevel: 'undergraduate',
  });
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPwdStrength] = useState({ score: 0, label: '', bar: 'transparent' });
  const [error, setError]             = useState(null);
  const { register, verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();

  /* ── style tokens ── */
  const lbl    = light ? '#374151' : '#D1D5DB';
  const iBase  = 'w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors';
  const iStyle = light
    ? { background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }
    : { background: '#18181f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
  const iFocus = light
    ? 'focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
    : 'focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  /* ── password strength ── */
  useEffect(() => {
    const pwd = formData.password;
    let s = 0;
    if (pwd.length > 5) s += 1;
    if (pwd.length > 8) s += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s += 1;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s += 1;
    if (!pwd) return setPwdStrength({ score: 0, label: '', bar: 'transparent' });
    if (s < 2)  return setPwdStrength({ score: s, label: 'Weak',   bar: '#EF4444' });
    if (s < 4)  return setPwdStrength({ score: s, label: 'Good',   bar: '#F59E0B' });
    setPwdStrength({ score: s, label: 'Strong', bar: '#10B981' });
  }, [formData.password]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const next = [...otp]; next[index] = value; setOtp(next);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(null);
    if (passwordStrength.score < 2) return setError('Please use a stronger password.');
    try {
      const { error: regError, data } = await register(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        education_level: formData.educationLevel,
      });
      if (!regError) {
        setEmailSent(data?.emailSent !== false);
        setStep(2);
      }
    } catch (err) { setError(err.message || 'Failed to register'); }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault(); setError(null);
    const token = otp.join('');
    if (token.length !== 6) return setError('Please enter a valid 6-digit code.');
    const { error: verifyError } = await verifyOtp(formData.email, token);
    if (!verifyError) {
      // If inside the landing page modal, switch to login tab
      if (onVerified) {
        onVerified();
      } else {
        // Fallback for standalone page (now redirected, but just in case)
        navigate('/?modal=login', { replace: true });
      }
    }
  };

  const handleResend = async () => {
    setError(null);
    const { error: resendError } = await resendOtp(formData.email);
    if (!resendError) setEmailSent(true);
  };

  /* ── submit button ── */
  const SubmitBtn = ({ disabled: dis, children: ch, loading: ld }) => (
    <button type="submit" disabled={dis || ld}
      className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
      style={{
        background: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
        boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
        opacity: (dis || ld) ? 0.6 : 1,
      }}>
      {ld ? (
        <svg className="animate-spin" width={16} height={16} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : ch}
    </button>
  );

  return (
    <div className="w-full relative min-h-[380px]">
      <AnimatePresence mode="wait">

        {/* ── STEP 1: Registration form ── */}
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg flex items-start gap-2 text-sm"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <FiAlertCircle className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                {[{ name: 'firstName', label: 'First Name' }, { name: 'lastName', label: 'Last Name' }].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium mb-1" style={{ color: lbl }}>{f.label}</label>
                    <input type="text" name={f.name} value={formData[f.name]} onChange={handleChange}
                      className={`${iBase} ${iFocus}`} style={iStyle} required />
                  </div>
                ))}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: lbl }}>Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#9CA3AF' }} />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className={`${iBase} ${iFocus} pl-9`} style={iStyle} required />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: lbl }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    className={`${iBase} ${iFocus} pr-10`} style={iStyle} required />
                  <button type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: '#9CA3AF' }}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {/* Strength meter */}
                {formData.password && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4].map(l => (
                        <div key={l} className="h-1 flex-1 rounded-full transition-all"
                          style={{ background: l <= passwordStrength.score ? passwordStrength.bar : '#E5E7EB' }} />
                      ))}
                    </div>
                    <span className="text-[10px]" style={{ color: passwordStrength.bar, fontWeight: 600 }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Education */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: lbl }}>Education Level</label>
                <select name="educationLevel" value={formData.educationLevel} onChange={handleChange}
                  className={`${iBase} ${iFocus} appearance-none cursor-pointer`} style={iStyle}>
                  <option value="high_school">High School</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="postgraduate">Postgraduate</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              <SubmitBtn loading={loading}>
                Continue <FiArrowRight size={14} />
              </SubmitBtn>
            </form>

            <p className="mt-4 text-center text-sm" style={{ color: '#6B7280' }}>
              Already have an account?{' '}
              {onSwitchToLogin ? (
                <button type="button" onClick={onSwitchToLogin}
                  className="font-semibold transition-colors hover:opacity-80" style={{ color: '#2563EB' }}>
                  Sign in
                </button>
              ) : (
                <Link to="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#2563EB' }}>
                  Sign in
                </Link>
              )}
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: OTP verification ── */}
        {step === 2 && (
          <motion.div key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center pt-2">

            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 text-2xl"
              style={{ background: '#EFF6FF', border: '2px solid #BFDBFE', color: '#2563EB' }}>
              <FiMail />
            </div>

            <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Check your email</h3>
            {!emailSent && (
              <div className="mb-4 p-3 rounded-lg text-sm text-left w-full"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                We could not send the verification email (server email may not be configured).
                Tap <strong>Resend code</strong> below, or check your spam folder.
              </div>
            )}
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              We've sent a 6-digit code to{' '}
              <span className="font-semibold" style={{ color: '#111827' }}>{formData.email}</span>
            </p>

            <form onSubmit={handleOtpSubmit} className="w-full">
              {error && (
                <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm text-left"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  <FiAlertCircle className="mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <div className="flex justify-between gap-2 mb-6">
                {otp.map((digit, idx) => (
                  <input key={idx} id={`otp-${idx}`} type="text" maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 rounded-xl text-center text-lg font-bold focus:outline-none transition-colors"
                    style={{
                      background: light ? '#F9FAFB' : '#18181f',
                      border: digit ? '2px solid #2563EB' : `1.5px solid ${light ? '#E5E7EB' : 'rgba(255,255,255,0.1)'}`,
                      color: light ? '#111827' : '#fff',
                      height: '52px',
                    }}
                  />
                ))}
              </div>

              <SubmitBtn loading={loading} disabled={otp.join('').length !== 6}>
                Verify Account
              </SubmitBtn>

              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={handleResend}
                  disabled={loading}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: '#2563EB' }}>
                  Didn't receive it? Resend code
                </button>
                <button type="button" onClick={() => setStep(1)}
                  className="text-sm flex items-center justify-center gap-1.5 transition-colors hover:opacity-80"
                  style={{ color: '#6B7280' }}>
                  <FiArrowLeft size={14} /> Wrong email? Go back
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
