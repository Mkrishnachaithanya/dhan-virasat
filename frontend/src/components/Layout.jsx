import React from 'react';
import { LayoutDashboard, CreditCard, Users, Sun, Moon, ShieldAlert, LogOut, UserCircle2 } from 'lucide-react';

export default function Layout({ currentView, onViewChange, theme, onToggleTheme, username, onLogout, children }) {
  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo">DV</div>
          <div className="brand-name-container">
            <span className="brand-title">Dhan Virasat</span>
            <span className="brand-subtitle">Digital Legacy</span>
          </div>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <div 
                className={`menu-item ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => onViewChange('dashboard')}
              >
                <LayoutDashboard size={20} />
                Dashboard
              </div>
            </li>
            <li>
              <div 
                className={`menu-item ${currentView === 'assets' ? 'active' : ''}`}
                onClick={() => onViewChange('assets')}
              >
                <CreditCard size={20} />
                Digital Assets
              </div>
            </li>
            <li>
              <div 
                className={`menu-item ${currentView === 'nominees' ? 'active' : ''}`}
                onClick={() => onViewChange('nominees')}
              >
                <Users size={20} />
                Beneficiary Nominees
              </div>
            </li>
            <li>
              <div 
                className={`menu-item ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => onViewChange('profile')}
              >
                <UserCircle2 size={20} />
                My Profile
              </div>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          {/* User Profile Card */}
          {username && (
            <div
              onClick={() => onViewChange('profile')}
              title="View My Profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: currentView === 'profile' ? 'rgba(99,102,241,0.10)' : 'var(--bg-card)',
                borderRadius: 'var(--border-radius-md)',
                border: currentView === 'profile' ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
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
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Standard Plan
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <ShieldAlert size={14} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              End-to-End Audited
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
