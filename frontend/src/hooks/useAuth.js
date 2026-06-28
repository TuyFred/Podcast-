/**
 * useAuth — authentication hook
 * - Register / OTP verify / resend OTP → backend API (so Brevo sends emails)
 * - Login / logout / password update → Supabase directly
 * - Forgot password / reset → backend API (so Brevo sends emails)
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import useAuthStore from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useAuth() {
  const { user, profile, loading, setLoading } = useAuthStore();
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Register via backend → Brevo sends OTP ──────────────── */
  const register = useCallback(async (email, password, userData = {}) => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        firstName:      userData.firstName || userData.first_name || '',
        lastName:       userData.lastName  || userData.last_name  || '',
        educationLevel: userData.educationLevel || userData.education_level || 'undergraduate',
        institution:    userData.institution   || '',
      });
      toast.success('Account created! Check your email for the verification code. 📬');
      return { data, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      toast.error(msg);
      return { data: null, error: { message: msg } };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Verify OTP (backend — our custom Brevo-sent code) ────── */
  const verifyOtp = useCallback(async (email, code) => {
    setActionLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp: code });
      toast.success('Email verified! You can now sign in. 🎉');
      return { data, error: null };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired code.';
      toast.error(msg);
      return { data: null, error: { message: msg } };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Resend OTP ───────────────────────────────────────────── */
  const resendOtp = useCallback(async (email) => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, { email });
      toast.success('New code sent! Check your email. 📬');
      return { error: null };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code.';
      toast.error(msg);
      return { error: { message: msg } };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Login via Supabase directly ──────────────────────────── */
  const login = useCallback(async (email, password) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back! 👋');
      return { data, error: null };
    } catch (err) {
      const msg = err.message?.includes('Invalid login') ? 'Invalid email or password.' : (err.message || 'Login failed.');
      toast.error(msg);
      return { data: null, error: { message: msg } };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Logout ───────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully.');
      return { error: null };
    } catch (err) {
      toast.error(err.message || 'Logout failed.');
      return { error: err };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Forgot Password → backend → Brevo sends OTP ─────────── */
  const forgotPassword = useCallback(async (email) => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      toast.success('Check your email for the password reset code. 📬');
      return { error: null };
    } catch (err) {
      // Backend always returns 200 to prevent enumeration; this handles network errors
      toast.error('Failed to send reset email. Please try again.');
      return { error: err };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Reset Password (OTP from Brevo) ─────────────────────── */
  const resetPassword = useCallback(async (email, otp, newPassword) => {
    setActionLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, { email, otp, newPassword });
      toast.success('Password reset! You can now sign in. 🔒');
      return { error: null };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      toast.error(msg);
      return { error: { message: msg } };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Update Password (authenticated) ─────────────────────── */
  const updatePassword = useCallback(async (newPassword) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated! 🔒');
      return { data, error: null };
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
      return { data: null, error: err };
    } finally {
      setActionLoading(false);
    }
  }, []);

  /* ── Update Profile ───────────────────────────────────────── */
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return { data: null, error: new Error('Not authenticated') };
    }
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      useAuthStore.getState().setProfile(data);
      toast.success('Profile updated! ✅');
      return { data, error: null };
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
      return { data: null, error: err };
    } finally {
      setActionLoading(false);
    }
  }, [user]);

  return {
    user,
    profile,
    loading: loading || actionLoading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updatePassword,
    updateProfile,
    verifyOtp,
    resendOtp,
  };
}

export default useAuth;
