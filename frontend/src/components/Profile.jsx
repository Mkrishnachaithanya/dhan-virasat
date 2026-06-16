import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, FileText, Lock, CheckCircle, ShieldAlert,
  Edit3, Save, X, Calendar, BarChart2, Users, CreditCard,
  Clock, Key, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

// ─── Small helper: coloured status badge ──────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Active:               { bg: 'rgba(16,185,129,.12)',  color: '#10b981', border: 'rgba(16,185,129,.25)' },
    'Pending Verification':{ bg: 'rgba(245,158,11,.12)', color: '#f59e0b', border: 'rgba(245,158,11,.25)' },
    Deceased:             { bg: 'rgba(239,68,68,.12)',   color: '#ef4444', border: 'rgba(239,68,68,.25)'  },
  };
  const s = cfg[status] || cfg.Active;
  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: 'var(--border-radius-full)',
      fontSize: '12px',
      fontWeight: 700,
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {status}
    </span>
  );
}

// ─── Inline success / error banner ────────────────────────────────────────
function Banner({ type, message, onClose }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '12px 16px',
      backgroundColor: isError ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.1)',
      border: `1px solid ${isError ? 'rgba(239,68,68,.25)' : 'rgba(16,185,129,.25)'}`,
      color: isError ? '#ef4444' : '#10b981',
      borderRadius: 'var(--border-radius-md)', fontSize: 13, marginBottom: 20,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isError ? <ShieldAlert size={15} /> : <CheckCircle size={15} />}
        {message}
      </span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display:'flex' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--border-radius-md)',
          backgroundColor: 'rgba(99,102,241,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
        }}>
          <Icon size={16} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
      </div>
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-input)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)',
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

// ─── Editable field row ───────────────────────────────────────────────────
function EditField({ label, name, value, editing, onChange, type = 'text', placeholder, icon: Icon, multiline }) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={13} />}
        {label}
      </label>
      {editing ? (
        multiline ? (
          <textarea
            name={name}
            className="form-input"
            style={{ resize: 'vertical', minHeight: 80 }}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
          />
        ) : (
          <input
            type={type}
            name={name}
            className="form-input"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
          />
        )
      ) : (
        <div style={{
          padding: '11px 12px',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          fontSize: 14,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontStyle: value ? 'normal' : 'italic',
        }}>
          {value || placeholder || '—'}
        </div>
      )}
    </div>
  );
}

// ─── Main Profile component ────────────────────────────────────────────────
export default function Profile({ onUsernameChange }) {
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [form, setForm]             = useState({});
  const [infoMsg, setInfoMsg]       = useState({ type: '', text: '' });
  const [saving, setSaving]         = useState(false);

  const [pwForm, setPwForm]         = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMsg, setPwMsg]           = useState({ type: '', text: '' });
  const [pwSaving, setPwSaving]     = useState(false);

  // ── Fetch profile ──
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        bio:        data.bio        || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ── Form helpers ──
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setForm({
      first_name: profile.first_name || '',
      last_name:  profile.last_name  || '',
      email:      profile.email      || '',
      phone:      profile.phone      || '',
      bio:        profile.bio        || '',
    });
    setInfoMsg({ type: '', text: '' });
  };

  // ── Save profile ──
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setInfoMsg({ type: '', text: '' });
    try {
      const updated = await api.updateProfile(form);
      setProfile(prev => ({ ...prev, ...updated }));
      setEditing(false);
      setInfoMsg({ type: 'success', text: 'Profile updated successfully!' });
      // Notify parent if display name changed
      if (updated.username) onUsernameChange?.(updated.username);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update profile.';
      setInfoMsg({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──
  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg({ type: '', text: '' });
    try {
      const res = await api.changePassword(
        pwForm.current_password,
        pwForm.new_password,
        pwForm.confirm_password
      );
      setPwMsg({ type: 'success', text: res.message || 'Password changed.' });
      // Update token if reissued
      if (res.token) {
        localStorage.setItem('dhan-virasat-token', res.token);
      }
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Password change failed.';
      setPwMsg({ type: 'error', text: msg });
    } finally {
      setPwSaving(false);
    }
  };

  // ── Format helpers ──
  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--color-danger)', padding: 48 }}>
        <ShieldAlert size={32} style={{ marginBottom: 12 }} />
        <p>Could not load profile data. Please refresh.</p>
      </div>
    );
  }

  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')) ||
                   profile.username?.[0]?.toUpperCase() || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 860 }}>

      {/* ── Page header ── */}
      <div className="view-header">
        <div className="view-title-container">
          <h1 className="view-title">My Profile</h1>
          <span className="view-subtitle">Manage your personal information, email, and account security.</span>
        </div>
      </div>

      {/* ── Hero identity card ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #a855f7 100%)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '32px',
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blob */}
        <div style={{
          position: 'absolute', width: 200, height: 200,
          borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)',
          top: -60, right: -40, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 120, height: 120,
          borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)',
          bottom: -30, right: 100, pointerEvents: 'none',
        }} />

        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '3px solid rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 800, color: 'white',
          textTransform: 'uppercase', flexShrink: 0,
          fontFamily: 'var(--font-heading)',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {(profile.first_name || profile.last_name)
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : profile.username}
            </h2>
            <StatusBadge status={profile.status} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 }}>
            @{profile.username}
          </p>
          {profile.bio && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
              "{profile.bio}"
            </p>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} /> Joined {fmtDate(profile.date_joined).split(',')[0]}
            </span>
            {profile.email && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={12} /> {profile.email}
              </span>
            )}
            {profile.phone && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={12} /> {profile.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <StatTile icon={CreditCard}  label="Digital Assets"    value={profile.assets_count}   color="var(--color-primary)" />
        <StatTile icon={Users}       label="Nominees"          value={profile.nominees_count} color="var(--color-success)" />
        <StatTile icon={Clock}       label="Check-in Status"   value={profile.status === 'Active' ? '✓' : '!'} color={profile.status === 'Active' ? 'var(--color-success)' : 'var(--color-warning)'} />
        <StatTile icon={Calendar}    label="Last Check-in"     value={fmtDate(profile.last_check_in).split(',')[0]} color="var(--color-warning)" />
      </div>

      {/* ── Global success / error banner ── */}
      {infoMsg.text && !editing && (
        <Banner type={infoMsg.type} message={infoMsg.text} onClose={() => setInfoMsg({ type:'', text:'' })} />
      )}

      {/* ── Personal Information ── */}
      <SectionCard icon={User} title="Personal Information">
        {editing && infoMsg.text && (
          <Banner type={infoMsg.type} message={infoMsg.text} onClose={() => setInfoMsg({ type:'', text:'' })} />
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <EditField
              label="First Name"  name="first_name"
              value={form.first_name} editing={editing}
              onChange={handleFormChange}
              placeholder="Your first name" icon={User}
            />
            <EditField
              label="Last Name"   name="last_name"
              value={form.last_name}  editing={editing}
              onChange={handleFormChange}
              placeholder="Your last name" icon={User}
            />
          </div>

          <EditField
            label="Email Address" name="email" type="email"
            value={form.email} editing={editing}
            onChange={handleFormChange}
            placeholder="your@email.com" icon={Mail}
          />

          <EditField
            label="Phone Number" name="phone" type="tel"
            value={form.phone} editing={editing}
            onChange={handleFormChange}
            placeholder="+91 98765 43210" icon={Phone}
          />

          <EditField
            label="Bio / Personal Note" name="bio"
            value={form.bio} editing={editing}
            onChange={handleFormChange}
            placeholder="A short personal note or instruction for your nominees..."
            icon={FileText} multiline
          />

          {/* Read-only fields */}
          <div style={{ marginTop: 4 }} className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={13} /> Username (read-only)
            </label>
            <div style={{
              padding: '11px 12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 14,
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}>
              @{profile.username}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Calendar size={13} /> Member Since
              </label>
              <div style={{ padding:'11px 12px', backgroundColor:'var(--bg-input)', border:'1px dashed var(--border-color)', borderRadius:'var(--border-radius-md)', fontSize:13, color:'var(--text-muted)' }}>
                {fmtDate(profile.date_joined)}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Clock size={13} /> Last Login
              </label>
              <div style={{ padding:'11px 12px', backgroundColor:'var(--bg-input)', border:'1px dashed var(--border-color)', borderRadius:'var(--border-radius-md)', fontSize:13, color:'var(--text-muted)' }}>
                {fmtDate(profile.last_login)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            {editing ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                  <X size={15} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={15} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => { setEditing(true); setInfoMsg({ type:'', text:'' }); }}>
                <Edit3 size={15} /> Edit Profile
              </button>
            )}
          </div>
        </form>
      </SectionCard>

      {/* ── Security / Change Password ── */}
      <SectionCard icon={Key} title="Change Password">
        {pwMsg.text && (
          <Banner type={pwMsg.type} message={pwMsg.text} onClose={() => setPwMsg({ type:'', text:'' })} />
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Lock size={13} /> Current Password
            </label>
            <input
              type="password" name="current_password" className="form-input"
              placeholder="Enter your current password"
              value={pwForm.current_password}
              onChange={handlePwChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Lock size={13} /> New Password
              </label>
              <input
                type="password" name="new_password" className="form-input"
                placeholder="Min. 6 characters"
                value={pwForm.new_password}
                onChange={handlePwChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Lock size={13} /> Confirm New Password
              </label>
              <input
                type="password" name="confirm_password" className="form-input"
                placeholder="Re-enter new password"
                value={pwForm.confirm_password}
                onChange={handlePwChange}
                required
              />
            </div>
          </div>

          {pwForm.new_password && pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--color-danger)', marginBottom:12 }}>
              <AlertTriangle size={12} /> Passwords do not match
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
              <ShieldCheck size={14} style={{ color:'var(--color-success)' }} />
              Your new token will be automatically updated after the change.
            </div>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={pwSaving || (pwForm.new_password !== pwForm.confirm_password)}
              style={{ minWidth: 160 }}
            >
              <Key size={15} />
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Inheritance Status ── */}
      <SectionCard icon={ShieldAlert} title="Inheritance & Check-in Status">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'16px 20px',
            backgroundColor:'var(--bg-input)',
            border:'1px solid var(--border-color)',
            borderRadius:'var(--border-radius-md)',
          }}>
            <div>
              <p style={{ fontWeight:600, fontSize:14 }}>Liveness Verification Status</p>
              <p style={{ color:'var(--text-secondary)', fontSize:12, marginTop:3 }}>
                Verified every 6 months. If expired, your assets may be transferred to nominees.
              </p>
            </div>
            <StatusBadge status={profile.status} />
          </div>

          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
          }}>
            <div style={{ padding:'14px 16px', backgroundColor:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--border-radius-md)' }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Last Verified On</p>
              <p style={{ fontSize:14, fontWeight:600, marginTop:4, color:'var(--text-primary)' }}>{fmtDate(profile.last_check_in)}</p>
            </div>
            <div style={{ padding:'14px 16px', backgroundColor:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'var(--border-radius-md)' }}>
              <p style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Next Deadline</p>
              <p style={{ fontSize:14, fontWeight:600, marginTop:4, color:'var(--color-warning)' }}>
                {profile.last_check_in
                  ? fmtDate(new Date(new Date(profile.last_check_in).getTime() + 180 * 86400000).toISOString())
                  : '—'}
              </p>
            </div>
          </div>

          <div style={{
            padding:'14px 16px', fontSize:12,
            color:'var(--text-secondary)',
            backgroundColor:'rgba(99,102,241,.06)',
            border:'1px solid rgba(99,102,241,.15)',
            borderRadius:'var(--border-radius-md)',
            lineHeight:1.6,
          }}>
            <strong style={{ color:'var(--color-primary)' }}>How it works:</strong>{' '}
            Every 6 months, the system will prompt you to verify you are alive by submitting an OTP code.
            If verification lapses, your status will move to <em>Pending Verification</em>. If still unverified,
            an authorised administrator can mark your account as <em>Deceased</em>, triggering the transfer
            of all your digital assets to your designated primary and backup nominees.
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
