import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../porrtal/AdminSidebar';
import AdminHeader from '../porrtal/AdminHeader';
import { RealtimeProvider } from '../../realtime/RealtimeProvider';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Prevent browser caching of admin pages
  useEffect(() => {
    // Add cache prevention headers
    document.querySelector('meta[http-equiv="Cache-Control"]')?.remove();
    document.querySelector('meta[http-equiv="Pragma"]')?.remove();
    document.querySelector('meta[http-equiv="Expires"]')?.remove();

    const cacheControlMeta = document.createElement('meta');
    cacheControlMeta.httpEquiv = 'Cache-Control';
    cacheControlMeta.content = 'no-store, no-cache, must-revalidate, private';
    document.head.appendChild(cacheControlMeta);

    const pragmaMeta = document.createElement('meta');
    pragmaMeta.httpEquiv = 'Pragma';
    pragmaMeta.content = 'no-cache';
    document.head.appendChild(pragmaMeta);

    const expiresMeta = document.createElement('meta');
    expiresMeta.httpEquiv = 'Expires';
    expiresMeta.content = '0';
    document.head.appendChild(expiresMeta);

    // Prevent back button cache
    const handleBeforeUnload = () => {
      window.history.replaceState(null, null, window.location.href);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleLogout = async (source = 'unknown') => {
    try {
      await logout(source);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to home even if logout fails
    navigate('/');
    }
  };

  return (
    <div className="antialiased bg-gray-50 min-h-screen">
      {/* Top Navigation Header */}
      <AdminHeader 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        user={user}
        onLogout={handleLogout}
      />

      {/* Sidebar */}
      <AdminSidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <RealtimeProvider>
        <main className="p-4 md:ml-80 h-auto pt-20 bg-gray-50">
          {children}
        </main>
      </RealtimeProvider>
    </div>
  );
};

export default AdminLayout; 