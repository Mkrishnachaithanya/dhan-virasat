import React, { useState, useEffect } from 'react';
import { CreditCard, Users, ShieldAlert, Award, Clock, ArrowRight, CheckCircle, Circle, HeartPulse, Send, AlertTriangle, Play, X } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ onViewChange }) {
  const [stats, setStats] = useState({
    total_assets: 0,
    total_nominees: 0,
    asset_by_type: {},
    recent_assets: [],
    recent_nominees: [],
    check_in_status: 'Active',
    last_check_in: null,
    next_check_in_deadline: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // OTP Verification Simulation State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [simulatedSMS, setSimulatedSMS] = useState('');
  const [otpVerifyError, setOtpVerifyError] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Could not fetch dashboard summary stats. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getPercentage = (count) => {
    if (stats.total_assets === 0) return 0;
    return Math.round((count / stats.total_assets) * 100);
  };

  const getCategoryColor = (type) => {
    switch (type) {
      case 'Bank': return 'var(--color-bank)';
      case 'Stock': return 'var(--color-stock)';
      case 'Crypto': return 'var(--color-crypto)';
      case 'Email': return 'var(--color-email)';
      case 'Document': return 'var(--color-document)';
      default: return 'var(--color-other)';
    }
  };

  const checkAssetHasNominee = () => {
    return stats.recent_assets.some(asset => asset.nominee !== null) || 
      (stats.total_assets > 0 && stats.recent_assets.length > 0 && stats.recent_assets.some(asset => asset.nominee_detail !== null));
  };

  // OTP check-in actions
  const handleTriggerOTP = async () => {
    setCheckinLoading(true);
    setOtpVerifyError('');
    try {
      const data = await api.sendOTP();
      setSimulatedSMS(data.otp_code);
      setOtpModalOpen(true);
    } catch (err) {
      console.error(err);
      setOtpVerifyError('Failed to trigger OTP.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCodeInput.trim()) return;

    setCheckinLoading(true);
    setOtpVerifyError('');
    try {
      await api.verifyOTP(otpCodeInput);
      setOtpModalOpen(false);
      setSimulatedSMS('');
      setOtpCodeInput('');
      fetchStats();
      alert('Verification successful! Your check-in timer has been reset for 6 months.');
    } catch (err) {
      console.error(err);
      setOtpVerifyError('Invalid verification code. Please check and try again.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleSimulateLeap = async () => {
    if (window.confirm('Simulate leaping 6 months forward in time? This will expire your check-in deadline.')) {
      setLoading(true);
      try {
        await api.simulateLeap();
        fetchStats();
      } catch (err) {
        console.error(err);
        setError('Failed to execute time leap.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getDaysRemaining = () => {
    if (!stats.next_check_in_deadline) return 0;
    const deadline = new Date(stats.next_check_in_deadline);
    const diffTime = deadline - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const checklistItems = [
    {
      id: 1,
      text: 'Add at least one trusted nominee (heir)',
      isDone: stats.total_nominees > 0
    },
    {
      id: 2,
      text: 'Catalog digital assets (banks, stocks, crypto wallets)',
      isDone: stats.total_assets > 0
    },
    {
      id: 3,
      text: 'Assign a designated beneficiary to at least one asset',
      isDone: stats.total_assets > 0 && stats.total_nominees > 0 && checkAssetHasNominee()
    },
    {
      id: 4,
      text: 'Verify activity check-in status (Timer Active)',
      isDone: stats.check_in_status === 'Active'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Simulated SMS Alert Bubble */}
      {simulatedSMS && (
        <div className="otp-simulation-alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📱 Simulated Device Notification
            </span>
            <button 
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}
              onClick={() => setSimulatedSMS('')}
            >
              Dismiss
            </button>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
            <strong>Dhan Virasat Security Alert:</strong> Your 6-month check-in verification code is: <code style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#0f172a', borderRadius: '4px' }}>{simulatedSMS}</code>
          </p>
        </div>
      )}

      <div className="view-header">
        <div className="view-title-container">
          <h2 className="view-title">Dhan Virasat Dashboard</h2>
          <span className="view-subtitle">Overview of your digital legacy and estate inheritance plan</span>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Dead Man's Switch / Check-in Status Banner */}
      <div className="checkin-widget">
        <div className="checkin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="status-indicator">
              <span className={`status-dot ${stats.check_in_status === 'Active' ? 'active' : stats.check_in_status === 'Pending Verification' ? 'warning' : 'deceased'}`} />
              Check-In Status: {stats.check_in_status}
            </div>
          </div>
          <div style={{ display: 'inline-flex', gap: '12px' }}>
            {stats.check_in_status !== 'Deceased' && (
              <>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleSimulateLeap}
                  disabled={loading}
                  style={{ gap: '6px' }}
                >
                  <Play size={12} />
                  Simulate Leap (+6 Months)
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleTriggerOTP}
                  disabled={checkinLoading}
                >
                  Check In Now (OTP)
                </button>
              </>
            )}
          </div>
        </div>

        {stats.check_in_status === 'Active' && stats.next_check_in_deadline && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Your check-in status is verified and safe. The next verification countdown expires on <strong>{new Date(stats.next_check_in_deadline).toLocaleDateString()}</strong> (~{getDaysRemaining()} days remaining).
          </p>
        )}

        {stats.check_in_status === 'Pending Verification' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#f59e0b', fontSize: '13px', margin: 0 }}>
            <AlertTriangle size={16} />
            <span><strong>Check-in Deadline Expired!</strong> Please click "Check In Now" and input your OTP code to prevent trigger of asset inheritance.</span>
          </div>
        )}

        {stats.check_in_status === 'Deceased' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#ef4444', fontSize: '13px', margin: 0 }}>
            <ShieldAlert size={16} />
            <span><strong>Inheritance Plans Triggered:</strong> Account marked as Deceased. Access is locked and assets are now viewable by nominees.</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onViewChange('assets')}>
          <div className="metric-icon-wrapper primary">
            <CreditCard size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{loading ? '...' : stats.total_assets}</span>
            <span className="metric-label">Total Assets</span>
          </div>
          <div className="metric-pattern">⚡</div>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onViewChange('nominees')}>
          <div className="metric-icon-wrapper success">
            <Users size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{loading ? '...' : stats.total_nominees}</span>
            <span className="metric-label">Total Nominees</span>
          </div>
          <div className="metric-pattern">👥</div>
        </div>
      </div>

      {/* Main Grid: Statistics breakdown & checklist */}
      <div className="dashboard-grid">
        {/* Left Column: Asset categories & checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Categories card */}
          <div className="dashboard-card">
            <div className="card-title-container">
              <h3 className="card-title">Asset Portfolio Allocation</h3>
            </div>
            
            {loading ? (
              <div>Loading allocation...</div>
            ) : stats.total_assets === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No assets added yet to show distribution.
              </div>
            ) : (
              <div className="category-distribution">
                {Object.entries(stats.asset_by_type).map(([type, count]) => {
                  const pct = getPercentage(count);
                  const color = getCategoryColor(type);
                  return (
                    <div key={type} className="category-bar-item">
                      <div className="category-bar-header">
                        <span className="category-bar-label">
                          <span className="category-dot" style={{ backgroundColor: color }} />
                          {type}
                        </span>
                        <span className="category-bar-value">{count} ({pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Checklist helper */}
          <div className="dashboard-card checklist-card">
            <div className="card-title-container">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--color-primary)' }} />
                Legacy Completion Checklist
              </h3>
            </div>
            <div className="checklist-items">
              {checklistItems.map(item => (
                <div key={item.id} className="checklist-item">
                  <span className="checklist-checkbox-wrapper">
                    {item.isDone ? (
                      <CheckCircle size={18} className="checklist-icon-done" />
                    ) : (
                      <Circle size={18} className="checklist-icon-todo" />
                    )}
                  </span>
                  <span className={`checklist-text ${item.isDone ? 'done' : ''}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline / Recents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="dashboard-card">
            <div className="card-title-container">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
                Recent Assets
              </h3>
              <span 
                style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                onClick={() => onViewChange('assets')}
              >
                All <ArrowRight size={12} />
              </span>
            </div>

            {loading ? (
              <div>Loading assets...</div>
            ) : stats.recent_assets.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                No assets added.
              </div>
            ) : (
              <div className="recent-list">
                {stats.recent_assets.map(asset => {
                  const color = getCategoryColor(asset.type);
                  return (
                    <div key={asset.id} className="recent-item">
                      <div className="recent-avatar" style={{ backgroundColor: color }}>
                        {asset.type.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="recent-details">
                        <span className="recent-name">{asset.name}</span>
                        <span className="recent-meta">{asset.platform}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="card-title-container">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: 'var(--text-secondary)' }} />
                Recent Nominees
              </h3>
              <span 
                style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                onClick={() => onViewChange('nominees')}
              >
                All <ArrowRight size={12} />
              </span>
            </div>

            {loading ? (
              <div>Loading nominees...</div>
            ) : stats.recent_nominees.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                No nominees designated.
              </div>
            ) : (
              <div className="recent-list">
                {stats.recent_nominees.map(nominee => (
                  <div key={nominee.id} className="recent-item">
                    <div 
                      className="recent-avatar" 
                      style={{ 
                        backgroundColor: nominee.relationship === 'Spouse' ? '#10b981' : '#3b82f6' 
                      }}
                    >
                      {nominee.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="recent-details">
                      <span className="recent-name">{nominee.name}</span>
                      <span className="recent-meta">{nominee.relationship}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OTP verification check-in modal */}
      {otpModalOpen && (
        <div className="modal-overlay" onClick={() => setOtpModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">OTP Check-In Verification</h3>
              <button className="modal-close" onClick={() => setOtpModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVerifyOTP}>
              <div className="modal-body">
                {otpVerifyError && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {otpVerifyError}
                  </div>
                )}

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  A simulated check-in code has been sent to your registered device. Enter the 6-digit verification code below to reset the activity timer.
                </p>

                <div className="form-group">
                  <label className="form-label">Verification OTP Code</label>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    className="form-input"
                    value={otpCodeInput}
                    onChange={(e) => setOtpCodeInput(e.target.value)}
                    maxLength={6}
                    required
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setOtpModalOpen(false)}
                  disabled={checkinLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={checkinLoading}
                  style={{ gap: '6px' }}
                >
                  <Send size={14} />
                  {checkinLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
