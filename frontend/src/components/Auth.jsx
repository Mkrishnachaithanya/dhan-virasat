import React, { useState } from 'react';
import { ShieldAlert, Lock, User, Mail, ShieldCheck, Smartphone, RefreshCw, ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../services/api';

/* ─────────────────────────────────────────────────────────────────
   OTP digit input — 6 boxes
   ───────────────────────────────────────────────────────────────── */
function OTPInput({ value, onChange }) {
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (e, idx) => {
    const key = e.key;
    if (key === 'Backspace') {
      const next = value.slice(0, Math.max(idx, 0));
      onChange(next);
      if (idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
      return;
    }
    if (!/^\d$/.test(key)) return;
    const next = (value + key).slice(0, 6);
    onChange(next);
    if (idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          readOnly
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          onClick={() => document.getElementById(`otp-${i}`)?.focus()}
          style={{
            width: 48, height: 56,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            background: 'var(--bg-input)',
            border: `2px solid ${d ? 'var(--color-primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'text',
            transition: 'border-color 0.15s',
            caretColor: 'var(--color-primary)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.target.style.borderColor = d ? 'var(--color-primary)' : 'var(--border-color)'}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Auth component
   ───────────────────────────────────────────────────────────────── */
export default function Auth({ onAuthSuccess }) {
  // 'credentials' → 'otp'
  const [step, setStep] = useState('credentials');
  const [activeTab, setActiveTab] = useState('login');

  // Credentials form
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // 2FA state
  const [pendingUserId,  setPendingUserId]  = useState(null);
  const [pendingUsername, setPendingUsername] = useState('');
  const [simulatedOTP,  setSimulatedOTP]   = useState('');
  const [otpValue,      setOtpValue]       = useState('');

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /* helpers */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* Step 1 — credentials */
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    const { username, email, password, confirmPassword } = formData;

    if (!username.trim() || !password.trim()) { setError('Username and password are required.'); return; }

    if (activeTab === 'register') {
      if (!email.trim()) { setError('Email address is required.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    }

    setLoading(true);
    try {
      if (activeTab === 'register') {
        const data = await api.register(username, email, password);
        // Registration still logs straight in (no 2FA for first-time register)
        localStorage.setItem('dhan-virasat-token',    data.token);
        localStorage.setItem('dhan-virasat-username', data.username);
        localStorage.setItem('dhan-virasat-is-staff', data.is_staff);
        onAuthSuccess(data.token, data.username);
      } else {
        // Login → Step 1: get OTP
        const data = await api.login(username, password);
        if (data.requires_otp) {
          setPendingUserId(data.user_id);
          setPendingUsername(username);
          setSimulatedOTP(data.otp_code);   // simulated — shown in the UI
          setOtpValue('');
          setStep('otp');
          setSuccess(`Verification code sent! (Simulated OTP: ${data.otp_code})`);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data || 'Authentication failed.';
      setError(typeof msg === 'string' ? msg : 'Check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 — verify OTP */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) { setError('Please enter all 6 digits of your OTP.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyLoginOTP(pendingUserId, otpValue);
      localStorage.setItem('dhan-virasat-token',    data.token);
      localStorage.setItem('dhan-virasat-username', data.username);
      localStorage.setItem('dhan-virasat-is-staff', data.is_staff);
      onAuthSuccess(data.token, data.username);
    } catch (err) {
      const msg = err.response?.data?.error || 'OTP verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* Resend OTP */
  const handleResend = async () => {
    setError('');
    setLoading(true);
    setOtpValue('');
    try {
      const data = await api.login(formData.username, formData.password);
      setSimulatedOTP(data.otp_code);
      setPendingUserId(data.user_id);
      setSuccess(`New OTP sent! (Simulated OTP: ${data.otp_code})`);
    } catch (err) {
      setError('Failed to resend OTP. Please go back and sign in again.');
    } finally {
      setLoading(false);
    }
  };

  /* Go back to credentials */
  const handleBack = () => {
    setStep('credentials');
    setError('');
    setSuccess('');
    setOtpValue('');
    setSimulatedOTP('');
  };

  /* ────────────────────── RENDER ──────────────────────── */
  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* Brand header */}
        <div className="auth-header">
          <div className="brand-logo" style={{ width: 52, height: 52, fontSize: 22 }}>DV</div>
          <div style={{ textAlign: 'center' }}>
            <h2 className="view-title" style={{ fontSize: 22 }}>Dhan Virasat</h2>
            <span className="view-subtitle" style={{ fontSize: 12 }}>Digital Asset Inheritance Planner</span>
          </div>
          {step === 'credentials' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              backgroundColor: 'rgba(37,99,235,0.08)',
              border: '1px solid rgba(37,99,235,0.20)',
              borderRadius: 'var(--border-radius-full)',
              fontSize: 11, color: 'var(--color-primary-light)',
            }}>
              <ShieldCheck size={12} />
              2-Factor Authentication Enabled
            </div>
          )}
        </div>

        {/* ── STEP 1: Credentials ─────────────────────────── */}
        {step === 'credentials' && (
          <>
            <div className="auth-tabs">
              <button type="button" className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => handleTabChange('login')}>
                Sign In
              </button>
              <button type="button" className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => handleTabChange('register')}>
                Create Account
              </button>
            </div>

            <form onSubmit={handleCredentials} className="auth-body">
              {error && (
                <div style={{ padding: '11px 14px', backgroundColor: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.22)', color: '#f87171', borderRadius: 'var(--border-radius-md)', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={15} /> {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} /> Username
                </label>
                <input type="text" name="username" className="form-input" placeholder="Enter your username" value={formData.username} onChange={handleChange} required autoFocus />
              </div>

              {activeTab === 'register' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} /> Email Address
                  </label>
                  <input type="email" name="email" className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={13} /> Password
                </label>
                <input type="password" name="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
              </div>

              {activeTab === 'register' && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} /> Confirm Password
                  </label>
                  <input type="password" name="confirmPassword" className="form-input" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Authenticating…' : activeTab === 'login' ? 'Continue to Verification →' : 'Register Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Smartphone size={12} />
                {activeTab === 'login' ? 'A one-time password will be sent to verify your identity.' : 'Accounts are protected with end-to-end encryption.'}
              </div>
            </form>
          </>
        )}

        {/* ── STEP 2: OTP Verification ─────────────────────── */}
        {step === 'otp' && (
          <div className="auth-body">

            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div style={{ height: 2, flex: 1, backgroundColor: 'var(--color-primary)', borderRadius: 2 }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--color-primary)' }}>
                <KeyRound size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Two-Factor Verification</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                We sent a 6-digit code to the email registered with <strong>@{pendingUsername}</strong>.
              </p>
            </div>

            {/* Simulated OTP alert box */}
            {simulatedOTP && (
              <div style={{
                padding: '12px 16px',
                marginBottom: 20,
                backgroundColor: 'rgba(5,150,105,.08)',
                border: '1px solid rgba(5,150,105,.25)',
                borderRadius: 'var(--border-radius-md)',
                fontSize: 12,
                color: 'var(--color-success)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Smartphone size={14} style={{ flexShrink: 0 }} />
                <span>
                  📱 <strong>Simulated Device Message:</strong>{' '}
                  Your Dhan Virasat verification code is{' '}
                  <strong style={{ fontSize: 15, letterSpacing: 2, color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4 }}>
                    {simulatedOTP}
                  </strong>
                </span>
              </div>
            )}

            {/* Error / success */}
            {error && (
              <div style={{ padding: '11px 14px', backgroundColor: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.22)', color: '#f87171', borderRadius: 'var(--border-radius-md)', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} /> {error}
              </div>
            )}
            {success && !error && (
              <div style={{ padding: '11px 14px', backgroundColor: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.22)', color: 'var(--color-success)', borderRadius: 'var(--border-radius-md)', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={15} /> {success}
              </div>
            )}

            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ display: 'block', textAlign: 'center', marginBottom: 14 }}>
                  Enter your 6-digit OTP
                </label>
                <OTPInput value={otpValue} onChange={setOtpValue} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                disabled={loading || otpValue.length < 6}
              >
                {loading ? 'Verifying…' : 'Confirm & Sign In'}
              </button>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleBack}>
                  <ArrowLeft size={13} /> Back
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleResend} disabled={loading}>
                  <RefreshCw size={13} className={loading ? 'spin-anim' : ''} /> Resend OTP
                </button>
              </div>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
              OTP expires in 10 minutes. Do not share it with anyone.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
