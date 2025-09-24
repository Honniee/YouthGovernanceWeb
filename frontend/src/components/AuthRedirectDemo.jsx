import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, shouldAutoRedirect, getRoleDisplayName } from '../utils/routeHelpers';
import { useLocation } from 'react-router-dom';

/**
 * Demo component to show auto-redirect logic
 * This can be temporarily added to any page for testing
 */
const AuthRedirectDemo = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
        <p className="text-blue-700">🔄 Checking authentication...</p>
      </div>
    );
  }

  const currentPath = location.pathname;
  const dashboardRoute = getDashboardRoute(user);
  const shouldRedirect = shouldAutoRedirect(currentPath);
  const roleDisplayName = getRoleDisplayName(user);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 Auth Redirect Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Authentication Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isAuthenticated 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </span>
        </div>

        {isAuthenticated && user && (
          <>
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">User:</span>
              <span className="text-gray-800">{user.first_name} {user.last_name}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Role:</span>
              <span className="text-gray-800">{roleDisplayName} ({user.user_type})</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Dashboard Route:</span>
              <span className="text-blue-600 font-mono">{dashboardRoute}</span>
            </div>
          </>
        )}

        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Current Path:</span>
          <span className="text-blue-600 font-mono">{currentPath}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium text-gray-600">Should Auto-Redirect:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            shouldRedirect 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {shouldRedirect ? '🔄 Yes' : '⏸️ No'}
          </span>
        </div>

        {isAuthenticated && user && shouldRedirect && dashboardRoute !== '/' && !currentPath.startsWith(dashboardRoute) && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 text-xs font-medium">
              🚀 Auto-redirect will occur: {currentPath} → {dashboardRoute}
            </p>
          </div>
        )}

        {isAuthenticated && user && currentPath.startsWith(dashboardRoute) && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 text-xs font-medium">
              ✅ User is already on their correct dashboard
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 This debug component can be removed in production
        </p>
      </div>
    </div>
  );
};

export default AuthRedirectDemo; 