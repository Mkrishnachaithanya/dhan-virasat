import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';
import NomineeList from './components/NomineeList';
import Profile from './components/Profile';
import Auth from './components/Auth';
import { api } from './services/api';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('dhan-virasat-token'));
  const [username, setUsername] = useState(() => localStorage.getItem('dhan-virasat-username'));
  const [currentView, setCurrentView] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('dhan-virasat-theme');
    return stored || 'dark';
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    localStorage.setItem('dhan-virasat-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleAuthSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout API call failed, forcing client session clear', err);
    } finally {
      localStorage.removeItem('dhan-virasat-token');
      localStorage.removeItem('dhan-virasat-username');
      localStorage.removeItem('dhan-virasat-is-staff');
      setToken(null);
      setUsername(null);
      setCurrentView('dashboard');
    }
  };

  const handleRefreshStats = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            key={`dashboard-${refreshTrigger}`} 
            onViewChange={setCurrentView} 
          />
        );
      case 'assets':
        return (
          <AssetList 
            key={`assets-${refreshTrigger}`} 
            onRefreshStats={handleRefreshStats} 
          />
        );
      case 'nominees':
        return (
          <NomineeList 
            key={`nominees-${refreshTrigger}`} 
            onRefreshStats={handleRefreshStats} 
          />
        );
      case 'profile':
        return (
          <Profile
            key={`profile-${refreshTrigger}`}
            onUsernameChange={(newName) => setUsername(newName)}
          />
        );
      default:
        return (
          <Dashboard 
            key={`dashboard-${refreshTrigger}`} 
            onViewChange={setCurrentView} 
          />
        );
    }
  };

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      theme={theme}
      onToggleTheme={toggleTheme}
      username={username}
      onLogout={handleLogout}
    >
      {renderActiveView()}
    </Layout>
  );
}

export default App;
