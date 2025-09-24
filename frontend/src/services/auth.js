import { apiHelpers } from './api.js';

// Authentication service functions
export const authService = {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} rememberMe - Whether to remember the user
   * @returns {Promise} Login response with user data and token
   */
  login: async (email, password, rememberMe = false, recaptchaToken = null) => {
    try {
      const response = await apiHelpers.post('/auth/login', {
        email,
        password,
        recaptchaToken
      });

      // Check if login was successful by looking for token
      if (response.token && response.user) {
        // Login successful - store authentication data
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }

        return {
          success: true,
          user: response.user,
          token: response.token,
          message: 'Login successful'
        };
      } else {
        // Login failed - don't store anything
        return {
          success: false,
          message: response.message || 'Login failed',
          errors: response.errors || []
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
        errors: error.errors || []
      };
    }
  },

  /**
   * Update current user's LYDO profile
   * @param {Object} updates - Partial fields to update (first_name, last_name, middle_name, suffix, personal_email, profile_picture)
   * @returns {Promise<{success:boolean, user?:object, message?:string}>}
   */
  updateProfile: async (updates) => {
    try {
      const response = await apiHelpers.put('/auth/me', updates);
      if (response.success && response.user) {
        // Keep localStorage user in sync
        const existing = authService.getStoredUser() || {};
        const merged = { ...existing, ...response.user };
        localStorage.setItem('user', JSON.stringify(merged));
        return { success: true, user: response.user };
      }
      return { success: false, message: response.message || 'Update failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Update failed', errors: error.errors || [] };
    }
  },

  /**
   * Logout current user
   * @param {string} source - Source of logout (header, sidebar, etc.)
   * @returns {Promise} Logout response
   */
  logout: async (source = 'unknown') => {
    try {
      // Call backend logout endpoint to log activity
      await apiHelpers.post('/auth/logout', { source });
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  },

  /**
   * Get current user information
   * @returns {Promise} Current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await apiHelpers.get('/auth/me');
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return {
        success: true,
        user: response.user
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get user information',
        errors: error.errors || []
      };
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  /**
   * Get stored user data
   * @returns {Object|null} User data or null
   */
  getStoredUser: () => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  },

  /**
   * Get stored auth token
   * @returns {string|null} Auth token or null
   */
  getStoredToken: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if remember me is enabled
   * @returns {boolean} Remember me status
   */
  getRememberMe: () => {
    return localStorage.getItem('rememberMe') === 'true';
  },

  /**
   * Check user role and permissions
   * @param {string} role - Role to check
   * @returns {boolean} Whether user has the role
   */
  hasRole: (role) => {
    const user = authService.getStoredUser();
    if (!user) return false;
    
    // Map userType to role names
    const roleMap = {
      'lydo_staff': ['admin', 'lydo_staff'],
      'sk_official': ['sk_official'],
      'youth': ['youth']
    };
    
    const userRoles = roleMap[user.userType] || [];
    return userRoles.includes(role) || user.role === role;
  },

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} Whether user has the permission
   */
  hasPermission: (permission) => {
    const user = authService.getStoredUser();
    if (!user || !user.permissions) return false;
    
    try {
      const permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions;
      
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  },

  /**
   * Get user's full name
   * @returns {string} Full name or email
   */
  getUserDisplayName: () => {
    const user = authService.getStoredUser();
    if (!user) return '';
    
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || 'User';
  },

  /**
   * Get user's role display name
   * @returns {string} Role display name
   */
  getUserRoleDisplayName: () => {
    const user = authService.getStoredUser();
    if (!user) return '';
    
    const roleDisplayMap = {
      'admin': 'Administrator',
      'lydo_staff': 'LYDO Staff',
      'sk_official': 'SK Official',
      'youth': 'Youth'
    };
    
    return roleDisplayMap[user.role] || user.role || 'User';
  },

  /**
   * Get test users for development
   * @returns {Promise} Test users data
   */
  getTestUsers: async () => {
    try {
      const response = await apiHelpers.get('/test/users');
      return {
        success: true,
        users: response.users,
        loginInfo: response.loginInfo
      };
    } catch (error) {
      console.error('Get test users error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get test users',
        errors: error.errors || []
      };
    }
  }
};

export default authService; 