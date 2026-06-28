import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
  background: '#0F172A', color: '#E2E8F0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' };
const cardStyle  = { background: '#1E293B', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', padding: 28, marginBottom: 20 };

export default function ProfilePage() {
  const { user, profile, session } = useAuthStore();

  const [form, setForm] = useState({
    first_name: '', last_name: '', institution: '',
    field_of_study: '', education_level: 'undergraduate',
  });
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [saving, setSaving]   = useState(false);
  const [pwBusy, setPwBusy]   = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name:      profile.first_name      || '',
        last_name:       profile.last_name        || '',
        institution:     profile.institution      || '',
        field_of_study:  profile.field_of_study   || '',
        education_level: profile.education_level  || 'undergraduate',
      });
    }
  }, [profile]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.patch(`${API}/api/auth/profile`, form, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match.'); return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.'); return;
    }
    setPwBusy(true);
    try {
      await axios.post(`${API}/api/auth/change-password`,
        { newPassword: passwords.newPassword },
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      toast.success('Password changed!');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password.');
    } finally { setPwBusy(false); }
  };

  const name   = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0];
  const avatar = (profile?.first_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32, padding: 24, borderRadius: 20, background: 'linear-gradient(135deg,#1E3A8A,#4F46E5)', color: '#fff' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, flexShrink: 0 }}>
          {avatar}
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{name}</h1>
          <p style={{ margin: '0 0 6px', opacity: 0.7, fontSize: 14 }}>{user?.email}</p>
          <span style={{ padding: '3px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
            {profile?.subscription_status || 'free'} plan · {profile?.role === 'admin' ? '⭐ Admin' : '🎓 Student'}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
          👤 Personal Information
        </h2>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="e.g. Fred" />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="e.g. Tuyishime" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address</label>
            <input style={{ ...inputStyle, background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }} value={user?.email || ''} disabled />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>Email cannot be changed.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Institution / School</label>
              <input style={inputStyle} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g. UR, MIT…" />
            </div>
            <div>
              <label style={labelStyle}>Field of Study</label>
              <input style={inputStyle} value={form.field_of_study} onChange={e => setForm(f => ({ ...f, field_of_study: e.target.value }))} placeholder="e.g. Computer Science" />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Education Level</label>
            <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              value={form.education_level} onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
              <option value="high_school">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="postgraduate">Postgraduate</option>
              <option value="professional">Professional</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password form */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
          🔒 Change Password
        </h2>
        <form onSubmit={savePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input type="password" style={inputStyle} value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters" />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" style={inputStyle} value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repeat new password" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={!passwords.newPassword || !passwords.confirmPassword || pwBusy}
              style={{ padding: '10px 28px', borderRadius: 12, border: '1.5px solid #6366F1', background: 'transparent', color: '#6366F1', fontWeight: 700, fontSize: 14, cursor: (!passwords.newPassword || pwBusy) ? 'not-allowed' : 'pointer', opacity: (!passwords.newPassword || pwBusy) ? 0.5 : 1 }}>
              {pwBusy ? 'Updating…' : '🔑 Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div style={{ ...cardStyle, marginBottom: 0 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
          ℹ️ Account Info
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Account Status', value: profile?.is_active !== false ? '✅ Active' : '🚫 Suspended', color: profile?.is_active !== false ? '#059669' : '#DC2626' },
            { label: 'Role',           value: profile?.role === 'admin' ? '⭐ Admin' : '🎓 Student', color: '#0F172A' },
            { label: 'Plan',           value: (profile?.subscription_status || 'free').charAt(0).toUpperCase() + (profile?.subscription_status || 'free').slice(1), color: '#7C3AED' },
            { label: 'Email Verified', value: profile?.is_email_verified ? '✅ Yes' : '⚠️ Pending', color: '#0F172A' },
          ].map(row => (
            <div key={row.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
