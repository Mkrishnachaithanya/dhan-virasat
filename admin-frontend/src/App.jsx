import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Layout from './components/Layout';
import AdminPortal from './components/AdminPortal';
import { api } from './services/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('dhan-virasat-admin-token') || null);
  const [username, setUsername] = useState(localStorage.getItem('dhan-virasat-admin-username') || null);
  const [currentView, setCurrentView] = useState('users'); // 'users' or 'logs'
  const [theme, setTheme] = useState(localStorage.getItem('dhan-virasat-admin-theme') || 'dark');

  // Handle successful login
  const handleAuthSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  // Handle sign out
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('dhan-virasat-admin-token');
      localStorage.removeItem('dhan-virasat-admin-username');
      localStorage.removeItem('dhan-virasat-admin-is-staff');
      setToken(null);
      setUsername(null);
    }
  };

  // Toggle theme dark/light
  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('dhan-virasat-admin-theme', newTheme);
  };

  useEffect(() => {
    // Add theme class to body or HTML document
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!token) {
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      theme={theme}
      onToggleTheme={handleToggleTheme}
      username={username}
      onLogout={handleLogout}
    >
      <AdminPortal currentView={currentView} />
    </Layout>
  );
}

export default App;
