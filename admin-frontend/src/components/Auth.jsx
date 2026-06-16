import React, { useState } from 'react';
import { ShieldAlert, Lock, User, ShieldCheck, KeyRound, Smartphone, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

/* 6-box OTP input */
function OTPInput({ value, onChange }) {
  const digits = value.padEnd(6, '').split('').slice(0, 6);
  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, Math.max(idx, 0)));
      if (idx > 0) document.getElementById(`adm-otp-${idx - 1}`)?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = (value + e.key).slice(0, 6);
    onChange(next);
    if (idx < 5) document.getElementById(`adm-otp-${idx + 1}`)?.focus();
  };
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(p);
    document.getElementById(`adm-otp-${Math.min(p.length, 5)}`)?.focus();
    e.preventDefault();
  };
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input key={i} id={`adm-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={d} readOnly onKeyDown={(e) => handleKey(e, i)} onPaste={handlePaste}
          onClick={() => document.getElementById(`adm-otp-${i}`)?.focus()}
          style={{
            width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            background: 'var(--bg-input)',
            border: `2px solid ${d ? 'var(--color-primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--text-primary)', outline: 'none', cursor: 'text',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.target.style.borderColor = d ? 'var(--color-primary)' : 'var(--border-color)'}
        />
      ))}
    </div>
  );
}

export default function Auth({ onAuthSuccess }) {
  const [step, setStep] = useState('credentials');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUsername, setPendingUsername] = useState('');
  const [simulatedOTP, setSimulatedOTP] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  /* Step 1 */
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.username.trim() || !formData.password.trim()) { setError('Username and password are required.'); return; }
    setLoading(true);
    try {
      const data = await api.login(formData.username, formData.password);
      setPendingUserId(data.user_id);
      setPendingUsername(formData.username);
      setSimulatedOTP(data.otp_code);
      setOtpValue('');
      setStep('otp');
      setSuccess(`Admin OTP dispatched. (Simulated: ${data.otp_code})`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) { setError('Enter all 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyLoginOTP(pendingUserId, otpValue);
      localStorage.setItem('dhan-virasat-admin-token',    data.token);
      localStorage.setItem('dhan-virasat-admin-username', data.username);
      localStorage.setItem('dhan-virasat-admin-is-staff', data.is_staff);
      onAuthSuccess(data.token, data.username);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true); setError(''); setOtpValue('');
    try {
      const data = await api.login(formData.username, formData.password);
      setSimulatedOTP(data.otp_code);
      setPendingUserId(data.user_id);
      setSuccess(`New OTP sent. (Simulated: ${data.otp_code})`);
    } catch {
      setError('Failed to resend. Please go back and try again.');
    } finally { setLoading(false); }
  };

  const handleBack = () => { setStep('credentials'); setError(''); setSuccess(''); setOtpValue(''); setSimulatedOTP(''); };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-logo" style={{ width: 52, height: 52, fontSize: 22 }}>DV</div>
          <div style={{ textAlign: 'center' }}>
            <h2 className="view-title" style={{ fontSize: 22 }}>Dhan Virasat</h2>
            <span style={{ fontSize: 11, color: 'var(--color-primary-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Staff Administrator Portal
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', backgroundColor: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.22)', borderRadius: 'var(--border-radius-full)', fontSize: 11, color: 'var(--color-primary)' }}>
            <ShieldCheck size={12} /> 2-Factor Authentication Required
          </div>
        </div>

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="auth-body">
            {error && (
              <div style={{ padding: '11px 14px', backgroundColor: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.22)', color: '#f87171', borderRadius: 'var(--border-radius-md)', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={15} /> {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={13} /> Admin Username</label>
              <input type="text" name="username" className="form-input" placeholder="Enter admin username" value={formData.username} onChange={handleChange} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={13} /> Password</label>
              <input type="password" name="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Authenticating…' : 'Continue to Verification →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Smartphone size={12} /> An OTP will be issued to complete staff access.
            </div>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <div className="auth-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div style={{ height: 2, flex: 1, backgroundColor: 'var(--color-primary)', borderRadius: 2 }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(217,119,6,.10)', border: '1px solid rgba(217,119,6,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-primary)' }}>
                <KeyRound size={22} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 5 }}>Admin 2FA Verification</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>6-digit code sent for <strong>@{pendingUsername}</strong></p>
            </div>

            {simulatedOTP && (
              <div style={{ padding: '11px 14px', marginBottom: 18, backgroundColor: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.22)', borderRadius: 'var(--border-radius-md)', fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Smartphone size={13} />
                <span>📱 <strong>Simulated:</strong> Admin OTP is <strong style={{ fontSize: 14, letterSpacing: 2, color: 'var(--text-primary)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4 }}>{simulatedOTP}</strong></span>
              </div>
            )}

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
              <div style={{ marginBottom: 22 }}>
                <label className="form-label" style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>Enter 6-digit Admin OTP</label>
                <OTPInput value={otpValue} onChange={setOtpValue} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} disabled={loading || otpValue.length < 6}>
                {loading ? 'Verifying…' : 'Confirm & Access Portal'}
              </button>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleBack}><ArrowLeft size={13} /> Back</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleResend} disabled={loading}><RefreshCw size={13} /> Resend</button>
              </div>
            </form>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>OTP expires in 10 minutes. Authorised personnel only.</p>
          </div>
        )}
      </div>
    </div>
  );
}
