import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';
import logger from '../utils/logger.js';

const ProtectedRoute = ({ children, requiredRole = null, requiredPermissions = [] }) => {
  const { isAuthenticated, user, isLoading, getCurrentUser } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [authValid, setAuthValid] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    // Prevent infinite retries - only verify once per authentication state change
    if (verificationAttempted) {
      return;
    }

    let isMounted = true;

    const verifyAuth = async () => {
      if (!isMounted) return;
      
      setIsVerifying(true);
      setVerificationAttempted(true);
      
      // Always verify authentication on protected route access
      // This prevents cached access after logout
      if (!isAuthenticated) {
        if (isMounted) {
        setAuthValid(false);
        setIsVerifying(false);
        }
        return;
      }

      try {
        // Verify with backend that the session is still valid
        const result = await getCurrentUser();
        if (isMounted) {
        if (result.success) {
          setAuthValid(true);
        } else {
          setAuthValid(false);
            // Don't retry on failure - redirect to login
          }
          setIsVerifying(false);
        }
      } catch (error) {
        if (isMounted) {
        logger.error('Auth verification failed', error);
        setAuthValid(false);
        setIsVerifying(false);
          // Don't retry on error - redirect to login
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]); // Remove getCurrentUser from dependencies to prevent infinite loop

  // Reset verification when authentication state changes
  useEffect(() => {
    setVerificationAttempted(false);
    setAuthValid(false);
  }, [isAuthenticated]);

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
      logger.warn('Access denied - role mismatch', { userType, requiredRole, userId: user?.id });
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