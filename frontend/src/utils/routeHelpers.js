/**
 * Route helper utilities for authentication-based navigation
 */

import logger from './logger.js';

/**
 * Get the dashboard route based on user role
 * @param {object} user - User object from authentication context
 * @returns {string} - Dashboard route path
 */
export const getDashboardRoute = (user) => {
  if (!user) {
    logger.debug('No user object provided to getDashboardRoute');
    return '/'; // Default to home if no user
  }

  // Handle both user_type (snake_case) and userType (camelCase)
  const userType = user.user_type || user.userType;
  
  // SECURITY: Only log in development, never expose full user object
  logger.debug('getDashboardRoute', {
    hasUser: !!user,
    userType: userType
  });
  
  if (!userType) {
    logger.debug('No user type found in user object');
    return '/'; // Default to home if no user type
  }

  const route = (() => {
    switch (userType.toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'lydo_staff':
        return '/staff';
      case 'sk_official':
        return '/sk';
      default:
        logger.debug(`Unknown user type: ${userType}`);
        return '/'; // Default to home for unknown roles
    }
  })();
  
  logger.debug(`Dashboard route determined: ${userType} → ${route}`);
  return route;
};

/**
 * Check if current path is a public route that should allow auto-redirect
 * @param {string} pathname - Current route pathname
 * @returns {boolean} - True if route allows auto-redirect
 */
export const shouldAutoRedirect = (pathname) => {
  const publicRoutes = [
    '/',           // Home page
    '/about',      // About page
    '/programs',   // Programs page
    '/sk-officials', // SK Officials page
    '/kk-survey',  // Survey page
    '/lydo-council', // LYDO Council page
  ];

  // Allow auto-redirect for public routes, but not for login or error pages
  return publicRoutes.includes(pathname);
};

/**
 * Check if current path is a public route that should be BLOCKED for authenticated users
 * @param {string} pathname - Current route pathname
 * @returns {boolean} - True if route is public and should be blocked
 */
export const isPublicRoute = (pathname) => {
  const publicRoutes = [
    '/',           // Home page
    '/about',      // About page
    '/programs',   // Programs page
    '/sk-officials', // SK Officials page
    '/kk-survey',  // Survey page
    '/lydo-council', // LYDO Council page
  ];

  // These routes are ALWAYS public and should be blocked for authenticated users
  return publicRoutes.includes(pathname);
};

/**
 * Check if user has access to a specific dashboard route
 * @param {object} user - User object
 * @param {string} route - Route to check access for
 * @returns {boolean} - True if user has access
 */
export const hasRouteAccess = (user, route) => {
  if (!user || !user.user_type) return false;

  const userType = user.user_type.toLowerCase();
  
  if (route.startsWith('/admin')) {
    return userType === 'admin';
  } else if (route.startsWith('/staff')) {
    return userType === 'lydo_staff';
  } else if (route.startsWith('/sk')) {
    return userType === 'sk_official';
  }
  
  return true; // Public routes are accessible to all
};

/**
 * Get user role display name
 * @param {object} user - User object
 * @returns {string} - Formatted role display name
 */
export const getRoleDisplayName = (user) => {
  if (!user || !user.user_type) return 'User';

  switch (user.user_type.toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'lydo_staff':
      return 'LYDO Staff';
    case 'sk_official':
      return 'SK Official';
    default:
      return 'User';
  }
}; 