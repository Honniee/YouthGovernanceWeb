import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermissions = [] }) => {
  const { isAuthenticated, user, isLoading, getCurrentUser } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [authValid, setAuthValid] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      setIsVerifying(true);
      
      // Always verify authentication on protected route access
      // This prevents cached access after logout
      if (!isAuthenticated) {
        setAuthValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        // Verify with backend that the session is still valid
        const result = await getCurrentUser();
        if (result.success) {
          setAuthValid(true);
        } else {
          setAuthValid(false);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        setAuthValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [isAuthenticated, getCurrentUser]);

  // Add cache control headers to prevent browser caching
  useEffect(() => {
    // Prevent browser from caching this page
    const preventCache = () => {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
      }
    };

    preventCache();

    // Prevent back button cache
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page was loaded from cache, redirect to login
        window.location.href = '/login';
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Show loading while verifying or during auth loading
  if (isLoading || isVerifying) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated or verification failed
  if (!isAuthenticated || !authValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements - should check userType, not role
  if (requiredRole) {
    const userType = user?.userType || user?.user_type;
    if (userType !== requiredRole) {
      console.log(`🚫 Access DENIED: User type ${userType} cannot access ${requiredRole} routes`);
      console.log(`👤 User:`, user);
      console.log(`🎯 Required: ${requiredRole}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const userPermissions = user?.permissions ? 
      (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [];
    
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 