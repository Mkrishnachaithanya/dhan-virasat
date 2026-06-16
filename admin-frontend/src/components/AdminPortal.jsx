import React, { useState, useEffect } from 'react';
import { 
  Search, Users, FileText, AlertTriangle, Eye, ShieldAlert, 
  CheckCircle, Clock, Calendar, RefreshCw, X, CreditCard, 
  Lock, Mail, Heart, AlertOctagon, Brain, Zap, TrendingUp,
  Activity, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPortal({ currentView }) {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('All');

  // Inspection Modal state
  const [inspectedUserId, setInspectedUserId] = useState(null);
  const [inspectedUserDetail, setInspectedUserDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState('assets'); // 'assets', 'nominees', 'logs'
  
  // Deceased Confirmation modal state
  const [deceasedConfirmUser, setDeceasedConfirmUser] = useState(null);

  // AI Analytics state
  const [aiData, setAiData]         = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState('');
  const [dispatchResult, setDispatchResult] = useState(null);
  const [dispatchingId, setDispatchingId]   = useState(null);

  // Fetch lists based on current view
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (currentView === 'users') {
        const usersList = await api.adminGetUsers();
        setUsers(usersList);
      } else if (currentView === 'logs') {
        const logsList = await api.adminGetLogs();
        setLogs(logsList);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from the administration backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentView]);

  // --- AI Analytics handlers ---
  const fetchAI = async () => {
    setAiLoading(true); setAiError(''); setDispatchResult(null);
    try {
      const data = await api.adminGetAIAnalysis();
      setAiData(data);
    } catch (err) {
      setAiError('Failed to run AI analysis. Ensure you are authenticated.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => { if (currentView === 'ai') fetchAI(); }, [currentView]);

  const handleDispatchOTP = async (userIds) => {
    const targetId = Array.isArray(userIds) ? null : userIds;
    setDispatchingId(targetId ?? 'all');
    setDispatchResult(null);
    try {
      const result = await api.adminAutoDispatchOTP(Array.isArray(userIds) ? userIds : [userIds]);
      setDispatchResult(result);
      fetchAI(); // refresh scores
    } catch {
      setDispatchResult({ error: 'OTP dispatch failed.' });
    } finally {
      setDispatchingId(null);
    }
  };

  const handleAutoDispatchAll = async () => {
    setDispatchingId('all');
    setDispatchResult(null);
    try {
      const result = await api.adminAutoDispatchOTP([]);
      setDispatchResult(result);
      fetchAI();
    } catch {
      setDispatchResult({ error: 'Auto-dispatch failed.' });
    } finally {
      setDispatchingId(null);
    }
  };

  // Risk colour helper
  const riskColors = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };
  const riskBgs    = { Critical: 'rgba(239,68,68,.10)', High: 'rgba(249,115,22,.10)', Medium: 'rgba(234,179,8,.10)', Low: 'rgba(34,197,94,.10)' };

  // Handle Mark Deceased
  const handleMarkDeceased = async (userId) => {
    setActionLoading(true);
    try {
      await api.adminMarkDeceased(userId);
      setDeceasedConfirmUser(null);
      // Refresh current user list
      const usersList = await api.adminGetUsers();
      setUsers(usersList);
      
      // If we are currently inspecting this user, update details too
      if (inspectedUserId === userId) {
        handleInspectUser(userId);
      }
    } catch (err) {
      console.error(err);
      alert('Error: Failed to mark user as deceased.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Inspect User
  const handleInspectUser = async (userId) => {
    setInspectedUserId(userId);
    setModalLoading(true);
    setModalTab('assets');
    try {
      const detail = await api.adminGetUserDetail(userId);
      setInspectedUserDetail(detail);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve detailed profile for user.');
      setInspectedUserId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeInspectionModal = () => {
    setInspectedUserId(null);
    setInspectedUserDetail(null);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = logs.filter(l => {
    const searchStr = `${l.username || 'System'} ${l.details || ''} ${l.entity || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(logSearch.toLowerCase());
    const matchesType = logTypeFilter === 'All' || l.action_type === logTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* View Header */}
      <div className="view-header">
        <div className="view-title-container">
          <h1 className="view-title">
            {currentView === 'users' ? 'User Legacy status' : 'Global Audit Trail'}
          </h1>
          <span className="view-subtitle">
            {currentView === 'users' 
              ? 'Monitor user activity check-ins, nominee links, and execute legacy inheritance procedures.' 
              : 'Global real-time security, modification, creation, and check-in audit stream.'}
          </span>
        </div>
        
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* --- View: Users legacy status --- */}
      {currentView === 'users' && (
        <>
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
              <select 
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Check-In Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              Loading users directory...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-secondary)' }}>
              No users found matching search criteria.
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Check-in Status</th>
                    <th>Last Check-In</th>
                    <th>Assets</th>
                    <th>Nominees</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    let statusColor = 'var(--text-muted)';
                    let statusBg = 'rgba(100, 116, 139, 0.1)';
                    if (u.status === 'Active') {
                      statusColor = 'var(--color-success)';
                      statusBg = 'rgba(16, 185, 129, 0.1)';
                    } else if (u.status === 'Pending Verification') {
                      statusColor = 'var(--color-warning)';
                      statusBg = 'rgba(245, 158, 11, 0.1)';
                    } else if (u.status === 'Deceased') {
                      statusColor = 'var(--color-danger)';
                      statusBg = 'rgba(239, 68, 68, 0.1)';
                    }

                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600' }}>{u.username}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusColor}22` }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{formatDate(u.last_check_in)}</td>
                        <td>
                          <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{u.assets_count}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>{u.nominees_count}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleInspectUser(u.id)}
                              style={{ padding: '6px 12px' }}
                            >
                              <Eye size={13} />
                              Inspect
                            </button>
                            
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeceasedConfirmUser(u)}
                              disabled={u.status === 'Deceased'}
                              style={{ 
                                padding: '6px 12px',
                                opacity: u.status === 'Deceased' ? 0.4 : 1,
                                cursor: u.status === 'Deceased' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Heart size={13} />
                              Deceased
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* --- View: Global Audit Logs --- */}
      {currentView === 'logs' && (
        <>
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)'
          }}>
            <div className="form-group" style={{ flexGrow: 1, minWidth: '240px', marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search logs by keyword, username, or message..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
              <select 
                className="form-input"
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
              >
                <option value="All">All Action Types</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="SECURITY">SECURITY</option>
                <option value="CHECKIN">CHECK-IN</option>
              </select>
            </div>
          </div>

          {/* Table timeline */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-secondary)' }}>
              No audit logs found matching search criteria.
            </div>
          ) : (
            <div className="log-timeline">
              {filteredLogs.map((log) => {
                let badgeColor = 'var(--text-muted)';
                let badgeBg = 'rgba(100, 116, 139, 0.1)';
                
                if (log.action_type === 'CREATE') {
                  badgeColor = 'var(--color-success)';
                  badgeBg = 'rgba(16, 185, 129, 0.15)';
                } else if (log.action_type === 'UPDATE') {
                  badgeColor = 'var(--color-stock)';
                  badgeBg = 'rgba(59, 130, 246, 0.15)';
                } else if (log.action_type === 'DELETE') {
                  badgeColor = 'var(--color-danger)';
                  badgeBg = 'rgba(239, 68, 68, 0.15)';
                } else if (log.action_type === 'SECURITY' || log.action_type === 'CHECKIN') {
                  badgeColor = 'var(--color-warning)';
                  badgeBg = 'rgba(245, 158, 11, 0.15)';
                }

                return (
                  <div className="log-timeline-item" key={log.id}>
                    <div className="log-icon-badge" style={{ backgroundColor: badgeBg, color: badgeColor }}>
                      <FileText size={16} />
                    </div>
                    
                    <div className="log-content">
                      <div className="log-header">
                        <div>
                          <span className="log-user" style={{ color: 'var(--text-primary)' }}>{log.username || 'System'}</span>
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 8px', 
                            fontSize: '9px', 
                            fontWeight: '700', 
                            borderRadius: '4px',
                            backgroundColor: badgeBg, 
                            color: badgeColor 
                          }}>
                            {log.action_type} - {log.entity}
                          </span>
                        </div>
                        <span className="log-date">{formatDate(log.timestamp)}</span>
                      </div>
                      <div className="log-details">{log.details}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* --- Inspection Modal --- */}
      {inspectedUserId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '820px', width: '90%' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700'
                }}>
                  {inspectedUserDetail ? inspectedUserDetail.username[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="modal-title">
                    {inspectedUserDetail ? `Inspect User: ${inspectedUserDetail.username}` : 'Loading User Profile...'}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {inspectedUserDetail ? inspectedUserDetail.email : ''}
                  </span>
                </div>
              </div>
              <button className="modal-close" onClick={closeInspectionModal}>
                <X size={20} />
              </button>
            </div>

            {modalLoading ? (
              <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading asset inventory and secure keys...
              </div>
            ) : inspectedUserDetail && (
              <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* User Info Stats Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Account Status</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: inspectedUserDetail.status === 'Active' ? 'var(--color-success)' : 
                               inspectedUserDetail.status === 'Deceased' ? 'var(--color-danger)' : 'var(--color-warning)' 
                      }}>
                        {inspectedUserDetail.status}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Vital Check-In</span>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', color: 'var(--text-primary)' }}>
                      {formatDate(inspectedUserDetail.last_check_in)}
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Assets Plan</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: 'var(--color-primary)' }}>
                      {inspectedUserDetail.assets ? inspectedUserDetail.assets.length : 0}
                    </div>
                  </div>
                </div>

                {/* Tab select inside modal */}
                <div className="admin-tabs" style={{ marginBottom: '20px' }}>
                  <button 
                    type="button" 
                    className={`admin-tab ${modalTab === 'assets' ? 'active' : ''}`}
                    onClick={() => setModalTab('assets')}
                  >
                    Digital Assets ({inspectedUserDetail.assets.length})
                  </button>
                  <button 
                    type="button" 
                    className={`admin-tab ${modalTab === 'nominees' ? 'active' : ''}`}
                    onClick={() => setModalTab('nominees')}
                  >
                    Nominees ({inspectedUserDetail.nominees.length})
                  </button>
                  <button 
                    type="button" 
                    className={`admin-tab ${modalTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setModalTab('logs')}
                  >
                    User Activity Logs ({inspectedUserDetail.logs.length})
                  </button>
                </div>

                {/* --- Modal Content: Assets --- */}
                {modalTab === 'assets' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {inspectedUserDetail.assets.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No assets registered by this user.</p>
                    ) : (
                      inspectedUserDetail.assets.map(asset => {
                        let typeColor = 'var(--color-other)';
                        if (asset.type === 'Bank') typeColor = 'var(--color-bank)';
                        else if (asset.type === 'Stock') typeColor = 'var(--color-stock)';
                        else if (asset.type === 'Crypto') typeColor = 'var(--color-crypto)';
                        else if (asset.type === 'Email') typeColor = 'var(--color-email)';
                        else if (asset.type === 'Document') typeColor = 'var(--color-document)';
                        
                        return (
                          <div key={asset.id} style={{
                            padding: '16px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontSize: '16px', fontWeight: '600' }}>{asset.name}</h4>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Platform: {asset.platform}</span>
                              </div>
                              <span className="badge" style={{ backgroundColor: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}>
                                {asset.type}
                              </span>
                            </div>

                            {/* Encrypted Field: Description */}
                            <div style={{
                              padding: '10px 12px',
                              backgroundColor: 'rgba(0, 0, 0, 0.15)',
                              borderRadius: '6px',
                              borderLeft: '3px solid var(--color-primary)',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              wordBreak: 'break-all',
                              color: 'var(--text-primary)'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                                <Lock size={10} /> Decrypted Safe-box Instruction
                              </span>
                              {asset.description || 'No description/instructions provided.'}
                            </div>

                            {/* Nominees Grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                              marginTop: '8px',
                              paddingTop: '12px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Nominee 1 (Primary)</span>
                                {asset.primary_nominee_detail ? (
                                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: '500' }}>
                                    {asset.primary_nominee_detail.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({asset.primary_nominee_detail.relationship})</span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{asset.primary_nominee_detail.email}</div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>None designated</div>
                                )}
                              </div>
                              
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Nominee 2 (Backup/Secondary)</span>
                                {asset.secondary_nominee_detail ? (
                                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: '500' }}>
                                    {asset.secondary_nominee_detail.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({asset.secondary_nominee_detail.relationship})</span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{asset.secondary_nominee_detail.email}</div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>None designated</div>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* --- Modal Content: Nominees --- */}
                {modalTab === 'nominees' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {inspectedUserDetail.nominees.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No nominees registered by this user.</p>
                    ) : (
                      inspectedUserDetail.nominees.map(nominee => (
                        <div key={nominee.id} style={{
                          padding: '16px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{nominee.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              <Mail size={12} />
                              <span style={{ fontFamily: 'monospace' }}>{nominee.email}</span> 
                              <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 'bold' }}>(Decrypted PII)</span>
                            </div>
                          </div>
                          
                          <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            {nominee.relationship}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* --- Modal Content: Logs --- */}
                {modalTab === 'logs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {inspectedUserDetail.logs.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No activity logged for this user.</p>
                    ) : (
                      inspectedUserDetail.logs.map(log => {
                        let badgeColor = 'var(--text-muted)';
                        let badgeBg = 'rgba(100, 116, 139, 0.1)';
                        if (log.action_type === 'CREATE') badgeColor = 'var(--color-success)';
                        else if (log.action_type === 'DELETE') badgeColor = 'var(--color-danger)';
                        else if (log.action_type === 'UPDATE') badgeColor = 'var(--color-stock)';
                        else if (log.action_type === 'SECURITY' || log.action_type === 'CHECKIN') badgeColor = 'var(--color-warning)';

                        return (
                          <div key={log.id} style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-md)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px'
                          }}>
                            <div>
                              <span style={{ 
                                padding: '1px 6px', 
                                fontSize: '9px', 
                                fontWeight: '700', 
                                borderRadius: '4px',
                                backgroundColor: badgeBg, 
                                color: badgeColor,
                                marginRight: '8px'
                              }}>
                                {log.action_type}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{log.details}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(log.timestamp)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeInspectionModal}>
                Close Inspector
              </button>
              {inspectedUserDetail && inspectedUserDetail.status !== 'Deceased' && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => {
                    setDeceasedConfirmUser(inspectedUserDetail);
                  }}
                >
                  <Heart size={14} />
                  Mark User as Deceased
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- Deceased Confirmation Modal --- */}
      {deceasedConfirmUser && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ borderBottomColor: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-danger)' }}>
                <AlertOctagon size={24} />
                <h3 className="modal-title">Confirm Deceased Override</h3>
              </div>
              <button className="modal-close" onClick={() => setDeceasedConfirmUser(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '0 24px 24px 24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                You are about to override the status of user <strong style={{ color: 'var(--color-warning)' }}>{deceasedConfirmUser.username}</strong> to <strong style={{ color: 'var(--color-danger)' }}>DECEASED</strong>.
              </p>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                <strong>IMPORTANT:</strong> This action signifies that the user has passed away. Standard accounts marked as Deceased can no longer request check-in OTP tokens or perform changes. Their assets will be flagged for priority heritage transmission to designated primary and backup beneficiaries.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTopColor: 'transparent' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeceasedConfirmUser(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => handleMarkDeceased(deceasedConfirmUser.id || deceasedConfirmUser.user_id)}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {actionLoading ? 'Overriding...' : 'Confirm Status Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- View: AI Analytics --- */}
      {currentView === 'ai' && (
        <>
          {/* Header */}
          <div className="view-header">
            <div className="view-title-container">
              <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Brain size={26} style={{ color: 'var(--color-primary)' }} />
                AI Activity Analyst
              </h1>
              <span className="view-subtitle">Automated audit-log analysis and risk-based OTP dispatch engine.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={fetchAI} disabled={aiLoading}>
                <RefreshCw size={13} className={aiLoading ? 'spin-anim' : ''} /> Run Analysis
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleAutoDispatchAll} disabled={dispatchingId === 'all'}>
                <Zap size={13} /> Auto-Dispatch All OTPs
              </button>
            </div>
          </div>

          {aiError && (
            <div style={{ padding: 14, backgroundColor: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.22)', color: '#f87171', borderRadius: 'var(--border-radius-md)', fontSize: 13 }}>
              <ShieldAlert size={15} style={{ marginRight: 8 }} />{aiError}
            </div>
          )}

          {/* Dispatch Result Toast */}
          {dispatchResult && (
            <div style={{ padding: 16, backgroundColor: dispatchResult.error ? 'rgba(220,38,38,.10)' : 'rgba(5,150,105,.08)', border: `1px solid ${dispatchResult.error ? 'rgba(220,38,38,.22)' : 'rgba(5,150,105,.22)'}`, borderRadius: 'var(--border-radius-md)', animation: 'slideUp 0.25s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: dispatchResult.error ? '#f87171' : 'var(--color-success)', fontSize: 13 }}>
                  {dispatchResult.error ? '❌ ' + dispatchResult.error : `✅ ${dispatchResult.message}`}
                </strong>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }} onClick={() => setDispatchResult(null)}>×</button>
              </div>
              {dispatchResult.dispatched && dispatchResult.dispatched.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dispatchResult.dispatched.map(d => (
                    <div key={d.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--border-radius-md)', fontSize: 12 }}>
                      <span><strong>{d.username}</strong> &lt;{d.email}&gt;</span>
                      <span style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: 'var(--color-primary-light)', letterSpacing: 2 }}>{d.otp_code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {aiLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div className="loading-spinner" />
              <span>AI engine analysing audit logs and activity patterns…</span>
            </div>
          )}

          {/* Summary Banner */}
          {aiData && !aiLoading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Total Users', value: aiData.summary.total_users, color: 'var(--color-blue)', bg: 'rgba(37,99,235,.08)' },
                  { label: '🔴 Critical',  value: aiData.summary.critical,    color: '#ef4444',            bg: 'rgba(239,68,68,.08)' },
                  { label: '🟠 High',      value: aiData.summary.high,        color: '#f97316',            bg: 'rgba(249,115,22,.08)' },
                  { label: '🟡 Medium',    value: aiData.summary.medium,      color: '#eab308',            bg: 'rgba(234,179,8,.08)' },
                  { label: '🟢 Low',       value: aiData.summary.low,         color: '#22c55e',            bg: 'rgba(34,197,94,.08)' },
                  { label: 'Need OTP',    value: aiData.summary.needs_otp_dispatch, color: 'var(--color-primary)', bg: 'rgba(217,119,6,.08)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '16px', backgroundColor: s.bg, border: `1px solid ${s.color}33`, borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>
                Analysis ran at {new Date(aiData.analyzed_at).toLocaleString()} — {aiData.analysis.length} user(s) evaluated.
              </p>

              {/* User Risk Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {aiData.analysis.map(user => {
                  const rc = riskColors[user.risk_level] || 'var(--text-muted)';
                  const rb = riskBgs[user.risk_level]   || 'rgba(100,116,139,.08)';
                  return (
                    <div key={user.user_id} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${rc}33`, borderLeft: `4px solid ${rc}`, borderRadius: 'var(--border-radius-lg)', padding: 20, boxShadow: 'var(--shadow-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        {/* Left — Identity + Score */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', backgroundColor: rb, border: `2px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: rc, flexShrink: 0 }}>
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{user.username}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span className="badge" style={{ backgroundColor: rb, color: rc, border: `1px solid ${rc}44` }}>{user.risk_level} Risk</span>
                              <span className="badge" style={{ backgroundColor: user.status === 'Active' ? 'rgba(34,197,94,.10)' : user.status === 'Deceased' ? 'rgba(239,68,68,.10)' : 'rgba(234,179,8,.10)', color: user.status === 'Active' ? '#22c55e' : user.status === 'Deceased' ? '#ef4444' : '#eab308', border: '1px solid transparent' }}>{user.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Centre — Activity Score gauge */}
                        <div style={{ textAlign: 'center', minWidth: 90 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Activity Score</div>
                          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-heading)', color: rc }}>{user.activity_score}</div>
                          <div style={{ height: 6, backgroundColor: 'var(--bg-input)', borderRadius: 4, marginTop: 4, overflow: 'hidden', width: 80, margin: '4px auto 0' }}>
                            <div style={{ height: '100%', width: `${user.activity_score}%`, backgroundColor: rc, borderRadius: 4, transition: 'width 1s ease' }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>out of 100</div>
                        </div>

                        {/* Right — Stats + Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span>Assets: <strong style={{ color: 'var(--text-primary)' }}>{user.asset_count}</strong></span>
                            <span>Nominees: <strong style={{ color: 'var(--text-primary)' }}>{user.nominee_count}</strong></span>
                            <span>30d Events: <strong style={{ color: 'var(--text-primary)' }}>{user.recent_activity_count}</strong></span>
                            <span>Days left: <strong style={{ color: user.days_until_deadline <= 30 ? rc : 'var(--text-primary)' }}>{user.days_until_deadline ?? 'N/A'}</strong></span>
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: 4 }}
                            onClick={() => handleDispatchOTP(user.user_id)}
                            disabled={user.status === 'Deceased' || dispatchingId === user.user_id}
                          >
                            {dispatchingId === user.user_id ? <RefreshCw size={12} className="spin-anim" /> : <Send size={12} />}
                            {dispatchingId === user.user_id ? 'Sending…' : 'Dispatch OTP'}
                          </button>
                        </div>
                      </div>

                      {/* AI Insights */}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Brain size={12} /> AI Insights
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {user.ai_insights.map((insight, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <span style={{ color: rc, marginTop: 2, flexShrink: 0 }}>▸</span>
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {aiData.analysis.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', color: 'var(--text-secondary)' }}>
                  No regular users found to analyse.
                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}
