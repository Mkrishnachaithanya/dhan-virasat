import React from 'react';
import { Users, FileText, Sun, Moon, ShieldCheck, LogOut, Brain } from 'lucide-react';

export default function Layout({ currentView, onViewChange, theme, onToggleTheme, username, onLogout, children }) {
  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo" style={{ background: 'linear-gradient(135deg, var(--color-warning), var(--color-danger))' }}>DV</div>
          <div className="brand-name-container">
            <span className="brand-title">Dhan Virasat</span>
            <span className="brand-subtitle" style={{ color: 'var(--color-warning)' }}>Admin Portal</span>
          </div>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <div 
                className={`menu-item ${currentView === 'users' ? 'active' : ''}`}
                onClick={() => onViewChange('users')}
              >
                <Users size={20} />
                Users &amp; Nominees
              </div>
            </li>
            <li>
              <div 
                className={`menu-item ${currentView === 'logs' ? 'active' : ''}`}
                onClick={() => onViewChange('logs')}
              >
                <FileText size={20} />
                Audit Logs
              </div>
            </li>
            <li>
              <div 
                className={`menu-item ${currentView === 'ai' ? 'active' : ''}`}
                onClick={() => onViewChange('ai')}
              >
                <Brain size={20} />
                AI Analytics
              </div>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          {/* User Profile Card */}
          {username && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-warning)',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}>
                  {username[0]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {username}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-warning)', fontWeight: '600' }}>
                    Administrator
                  </span>
                </div>
              </div>
              <button 
                title="Logout" 
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={onLogout}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          <div className="theme-toggle" onClick={onToggleTheme}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>
              Toggle
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-warning)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Staff Inspector Mode
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
