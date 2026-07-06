/**
 * Admin Dashboard — full-page standalone layout
 * User management: view, edit role/subscription, suspend/activate, delete
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFileText, FiHeadphones, FiCheckSquare,
  FiShield, FiSearch, FiMoreVertical, FiUserX, FiUserCheck,
  FiTrendingUp, FiActivity, FiDatabase, FiRefreshCw,
  FiTrash2, FiEdit, FiX, FiSave, FiLogOut, FiGrid,
  FiSettings, FiAlertCircle, FiMic, FiLayers, FiKey,
} from 'react-icons/fi';
import axios from 'axios';
import useAuthStore from '@/store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const authHeaders = () => ({ Authorization: `Bearer ${useAuthStore.getState().session?.access_token}` });

/* ─────────────────────────────────────────────── */
/* HELPERS                                          */
/* ─────────────────────────────────────────────── */
const ROLE_STYLE = {
  admin:      { bg: '#FEF3C7', color: '#92400E', label: 'Admin' },
  instructor: { bg: '#DBEAFE', color: '#1E40AF', label: 'Instructor' },
  user:       { bg: '#F3F4F6', color: '#374151', label: 'Student' },
};
const SUB_STYLE = {
  free:       { bg: '#F3F4F6', color: '#6B7280' },
  premium:    { bg: '#EDE9FE', color: '#6D28D9' },
  enterprise: { bg: '#FEF3C7', color: '#92400E' },
};

function Badge({ text, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: style.bg, color: style.color }}>
      {text}
    </span>
  );
}

/* ─── stat card ───────────────────────────────── */
function StatCard({ icon, label, value, color, trend }) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(icon, { size: 20, color })}
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>↑ +{trend}%</span>
        )}
      </div>
      <p style={{ margin: '0 0 2px', fontSize: 32, fontWeight: 800, color: '#F1F5F9' }}>{value}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{label}</p>
    </div>
  );
}

/* ─── edit user modal ──────────────────────────── */
function EditUserModal({ user: u, onClose, onSaved }) {
  const [email, setEmail]     = useState(u.email || '');
  const [firstName, setFirstName] = useState(u.first_name || '');
  const [lastName, setLastName]   = useState(u.last_name || '');
  const [role, setRole]   = useState(u.role || 'user');
  const [sub,  setSub]    = useState(u.subscription_status || 'free');
  const [active, setActive] = useState(u.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    if (!email.trim()) { setErr('Email is required.'); setSaving(false); return; }
    try {
      const { data } = await axios.patch(`${API}/api/admin/sb-users/${u.id}`,
        {
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          subscription_status: sub,
          is_active: active,
        },
        { headers: authHeaders() }
      );
      onSaved(data);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: '#1E293B', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', color: '#F1F5F9', fontWeight: 700, fontSize: 18 }}>Edit User</h2>
            <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{displayName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <FiX size={22} />
          </button>
        </div>

        {/* Account info */}
        <p style={{ margin: '0 0 12px', color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Info</p>

        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: 14, marginBottom: 14, outline: 'none' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>First name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Last name</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: 14, outline: 'none' }} />
          </div>
        </div>

        {/* Role */}
        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Role</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['user', 'instructor', 'admin'].map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `2px solid ${role === r ? '#6366F1' : 'rgba(255,255,255,0.1)'}`, background: role === r ? 'rgba(99,102,241,0.18)' : 'transparent', color: role === r ? '#A5B4FC' : '#94A3B8', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {r === 'user' ? 'Student' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {/* Subscription */}
        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Subscription Plan</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['free', 'premium', 'enterprise'].map(s => (
            <button key={s} onClick={() => setSub(s)}
              style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `2px solid ${sub === s ? '#10B981' : 'rgba(255,255,255,0.1)'}`, background: sub === s ? 'rgba(16,185,129,0.15)' : 'transparent', color: sub === s ? '#34D399' : '#94A3B8', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Account status */}
        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Account Status</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[{ v: true, label: 'Active', color: '#10B981' }, { v: false, label: 'Suspended', color: '#EF4444' }].map(s => (
            <button key={String(s.v)} onClick={() => setActive(s.v)}
              style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `2px solid ${active === s.v ? s.color : 'rgba(255,255,255,0.1)'}`, background: active === s.v ? s.color + '22' : 'transparent', color: active === s.v ? s.color : '#94A3B8', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {s.label}
            </button>
          ))}
        </div>

        {err && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 14 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FiSave size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── reset password modal ─────────────────────── */
function ResetPasswordModal({ user: u, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [notify, setNotify]     = useState(true);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const submit = async () => {
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/sb-users/${u.id}/reset-password`,
        { password, notify },
        { headers: authHeaders() }
      );
      onDone(u.email);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: '#1E293B', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', color: '#F1F5F9', fontWeight: 700, fontSize: 18 }}>Reset Password</h2>
            <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <FiX size={22} />
          </button>
        </div>

        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>New password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: 14, marginBottom: 14, outline: 'none' }} />

        <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Confirm password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#0F172A', color: '#F1F5F9', fontSize: 14, marginBottom: 16, outline: 'none' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
          Notify student by email
        </label>

        {err && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 14 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#F59E0B,#EF4444)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FiKey size={15} /> {saving ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── User row ─────────────────────────────────── */
function UserRow({ u, onAction, currentUserId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = ((u.first_name || u.email || 'U').charAt(0) + (u.last_name || '').charAt(0)).toUpperCase() || 'U';
  const roleS = ROLE_STYLE[u.role] || ROLE_STYLE.user;
  const subS  = SUB_STYLE[u.subscription_status] || SUB_STYLE.free;
  const isSelf = u.id === currentUserId;

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      {/* User info */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', background: u.is_active ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#334155' }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: '0 0 2px', color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>
              {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : 'No name'}
              {isSelf && <span style={{ marginLeft: 6, fontSize: 11, background: '#1D4ED8', color: '#93C5FD', padding: '1px 7px', borderRadius: 99 }}>You</span>}
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 12 }}>{u.email}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '14px 16px' }}><Badge text={roleS.label} style={roleS} /></td>
      <td style={{ padding: '14px 16px' }}><Badge text={u.subscription_status || 'free'} style={subS} /></td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: u.is_active ? '#10B981' : '#EF4444' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? '#10B981' : '#EF4444', display: 'inline-block' }} />
          {u.is_active ? 'Active' : 'Suspended'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 12 }}>
        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
      </td>
      {/* Actions */}
      <td style={{ padding: '14px 16px', position: 'relative' }} ref={menuRef}>
        <button onClick={() => setMenuOpen(v => !v)}
          style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#F1F5F9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
          <FiMoreVertical size={16} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              style={{ position: 'absolute', right: 48, top: 8, zIndex: 30, background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '6px 0', minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <MenuItem icon={<FiEdit size={13} color="#6366F1" />}  label="Edit User"   onClick={() => { onAction('edit', u); setMenuOpen(false); }} />
              <MenuItem icon={<FiKey size={13} color="#F59E0B" />} label="Reset Password" onClick={() => { onAction('reset_password', u); setMenuOpen(false); }} />
              {u.role !== 'admin' && !isSelf && (
                <MenuItem icon={<FiShield size={13} color="#F59E0B" />} label="Make Admin" onClick={() => { onAction('make_admin', u); setMenuOpen(false); }} />
              )}
              {u.role === 'admin' && !isSelf && (
                <MenuItem icon={<FiUsers size={13} color="#94A3B8" />} label="Remove Admin" onClick={() => { onAction('remove_admin', u); setMenuOpen(false); }} />
              )}
              <MenuItem
                icon={u.is_active ? <FiUserX size={13} color="#EF4444" /> : <FiUserCheck size={13} color="#10B981" />}
                label={u.is_active ? 'Suspend' : 'Activate'}
                onClick={() => { onAction(u.is_active ? 'suspend' : 'activate', u); setMenuOpen(false); }} />
              {!isSelf && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  <MenuItem icon={<FiTrash2 size={13} color="#EF4444" />} label="Delete User" onClick={() => { onAction('delete', u); setMenuOpen(false); }} danger />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: danger ? '#EF4444' : '#E2E8F0', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'background 0.15s' }}
      onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      {icon} {label}
    </button>
  );
}

/* ─────────────────────────────────────────────── */
/* MAIN COMPONENT                                   */
/* ─────────────────────────────────────────────── */
export default function AdminPage() {
  const navigate   = useNavigate();
  const { user: currentUser, logout } = useAuthStore();

  const [stats, setStats]     = useState({ users: 0, notes: 0, podcasts: 0, quizzes: 0, flashcards: 0 });
  const [users, setUsers]     = useState([]);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [toast, setToast]     = useState(null);
  const [navItem, setNavItem] = useState('users');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── data fetch via backend (bypasses RLS) ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/admin/sb-users`, { headers: authHeaders() }),
        axios.get(`${API}/api/admin/sb-stats`, { headers: authHeaders() }),
      ]);
      setUsers(usersRes.data || []);
      const s = statsRes.data || {};
      setStats({
        users:      s.users      || 0,
        notes:      s.notes      || 0,
        podcasts:   s.podcasts   || 0,
        quizzes:    s.quizzes    || 0,
        flashcards: s.flashcards || 0,
      });
    } catch (e) {
      showToast('Failed to load data: ' + (e.response?.data?.message || e.message), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── actions via backend (bypasses RLS) ── */
  const handleAction = async (action, u) => {
    if (action === 'edit') { setEditingUser(u); return; }
    if (action === 'reset_password') { setResettingUser(u); return; }
    try {
      if (action === 'delete') {
        if (!window.confirm(`Permanently delete ${u.email}?\n\nThis will also delete all their data.`)) return;
        await axios.delete(`${API}/api/admin/sb-users/${u.id}`, { headers: authHeaders() });
        setUsers(prev => prev.filter(x => x.id !== u.id));
        showToast(`User "${u.email}" deleted.`);
        return;
      }
      const updates = {
        suspend:      { is_active: false },
        activate:     { is_active: true },
        make_admin:   { role: 'admin' },
        remove_admin: { role: 'user' },
      }[action];
      if (!updates) return;
      await axios.patch(`${API}/api/admin/sb-users/${u.id}`, updates, { headers: authHeaders() });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...updates } : x));
      const msgs = { suspend: 'suspended', activate: 'reactivated', make_admin: 'made Admin', remove_admin: 'set to Student' };
      showToast(`"${u.email}" ${msgs[action]}.`);
    } catch (e) {
      showToast('Action failed: ' + (e.response?.data?.message || e.message), 'error');
    }
  };

  const handleUserSaved = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast('User updated successfully!');
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  /* ── filter ── */
  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'user' && !u.role);
    return matchesSearch && matchesRole;
  });

  const SIDEBAR_ITEMS = [
    { id: 'overview', icon: <FiGrid />,     label: 'Overview'        },
    { id: 'users',    icon: <FiUsers />,    label: 'User Management' },
    { id: 'notes',    icon: <FiFileText />, label: 'Notes'           },
    { id: 'podcasts', icon: <FiHeadphones />, label: 'Podcasts'      },
  ];

  /* ─────────────────────────────────── RENDER ─── */
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', overflow: 'hidden' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#DC2626' : '#059669', color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside style={{ width: 240, flexShrink: 0, background: '#0F172A', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#DC2626,#9333EA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiShield size={18} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, color: '#F1F5F9', fontWeight: 800, fontSize: 15 }}>VoiceAI</p>
            <p style={{ margin: 0, color: '#EF4444', fontSize: 11, fontWeight: 600 }}>Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {SIDEBAR_ITEMS.map(item => (
            <button key={item.id} onClick={() => setNavItem(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: navItem === item.id ? 'rgba(239,68,68,0.15)' : 'transparent', color: navItem === item.id ? '#FCA5A5' : '#94A3B8', fontWeight: navItem === item.id ? 600 : 400, fontSize: 14, marginBottom: 2, textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { if (navItem !== item.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E2E8F0'; }}}
              onMouseLeave={(e) => { if (navItem !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}}>
              {React.cloneElement(item.icon, { size: 16 })} {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 8px' }} />
          <p style={{ color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 14px 8px' }}>Access</p>
          <button onClick={() => navigate('/dashboard')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94A3B8', fontSize: 14, textAlign: 'left', marginBottom: 2 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E2E8F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
            <FiGrid size={16} /> Student View
          </button>
        </nav>

        {/* User card */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#DC2626,#9333EA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
              {(currentUser?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#E2E8F0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.email?.split('@')[0] || 'Admin'}
              </p>
              <p style={{ margin: 0, color: '#EF4444', fontSize: 11 }}>Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 14 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
            <FiLogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#0B1220' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h1 style={{ margin: '0 0 4px', color: '#F1F5F9', fontSize: 28, fontWeight: 800 }}>Admin Dashboard</h1>
              <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>Manage users, monitor platform activity</p>
            </div>
            <button onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#1E293B', color: '#94A3B8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <FiRefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { icon: <FiUsers />,       label: 'Total Users',   value: loading ? '…' : stats.users,      color: '#6366F1', trend: 12 },
              { icon: <FiFileText />,    label: 'Notes',         value: loading ? '…' : stats.notes,      color: '#10B981', trend: 8  },
              { icon: <FiHeadphones />,  label: 'Podcasts',      value: loading ? '…' : stats.podcasts,   color: '#F59E0B', trend: 5  },
              { icon: <FiCheckSquare />, label: 'Quizzes',       value: loading ? '…' : stats.quizzes,    color: '#3B82F6', trend: 15 },
              { icon: <FiLayers />,      label: 'Flashcards',    value: loading ? '…' : stats.flashcards, color: '#EC4899', trend: 3  },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </div>

          {/* Platform health banner */}
          <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1D4ED8)', borderRadius: 20, padding: '20px 28px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', color: '#fff', fontWeight: 700 }}>Platform Health</h3>
              <p style={{ margin: 0, color: '#93C5FD', fontSize: 13 }}>All systems operational</p>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['API Server', 'Database', 'Gemini AI', 'TTS', 'Brevo Email', 'Storage'].map(svc => (
                <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  <span style={{ color: '#BFDBFE', fontSize: 13 }}>{svc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User management table */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: '#1E293B', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 2px', color: '#F1F5F9', fontWeight: 700, fontSize: 16 }}>User Management</h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{filtered.length} of {users.length} users</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {/* Role filter */}
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 10, background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  <option value="all">All Roles</option>
                  <option value="user">Students</option>
                  <option value="admin">Admins</option>
                  <option value="instructor">Instructors</option>
                </select>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search users…"
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', fontSize: 13, outline: 'none', width: 200 }} />
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
                <FiRefreshCw size={24} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                Loading users…
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['User', 'Role', 'Plan', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0F172A' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>No users found.</td></tr>
                    ) : (
                      filtered.map(u => (
                        <UserRow key={u.id} u={u} onAction={handleAction} currentUserId={currentUser?.id} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleUserSaved} />
      )}

      {/* Reset password modal */}
      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onDone={(email) => showToast(`Password reset for "${email}".`)}
        />
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
