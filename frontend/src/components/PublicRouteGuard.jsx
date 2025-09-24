import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { getDashboardRoute } from '../utils/routeHelpers';

const PublicRouteGuard = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();
  


  // Show loading while auth is being determined
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // If user is authenticated, redirect them to their appropriate dashboard
  if (isAuthenticated && user) {
    const dashboardRoute = getDashboardRoute(user);
    
    // Only redirect if they have a specific dashboard (not home page)
    if (dashboardRoute !== '/') {
      return <Navigate to={dashboardRoute} replace />;
    }
  }

  // Allow access to public pages for unauthenticated users or users with home dashboard
  return children;
};

export default PublicRouteGuard; 