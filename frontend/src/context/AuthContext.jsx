import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.js';
import logger from '../utils/logger.js';
import api from '../services/api.js';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  rememberMe: false
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESTORE_SESSION: 'RESTORE_SESSION',
  SET_LOADING: 'SET_LOADING'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        rememberMe: action.payload.rememberMe || false
      };
    
    case AUTH_ACTIONS.LOGIN_ERROR:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        rememberMe: false
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        rememberMe: false
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case AUTH_ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        rememberMe: action.payload.rememberMe || false
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Session restoration on app load
  useEffect(() => {
    // SECURITY: Get CSRF token on app load
    const getCSRFToken = async () => {
      try {
        await api.get('/csrf-token');
        logger.debug('CSRF token obtained');
      } catch (error) {
        logger.warn('Failed to get CSRF token', error);
      }
    };
    getCSRFToken();

    const restoreSession = async () => {
      try {
        logger.debug('Starting session restoration');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        
        const storedUser = authService.getStoredUser();
        const storedToken = authService.getStoredToken();
        const rememberMe = authService.getRememberMe();

        logger.debug('Stored data', {
          hasUser: !!storedUser,
          hasToken: !!storedToken,
          rememberMe
        });

        // SECURITY: Tokens are in httpOnly cookies (not accessible to JavaScript)
        // If we have stored user data, try to verify session with backend
        // Backend will check cookies automatically
        if (storedUser) {
          logger.debug('Found stored user data, verifying session with backend');
          // Verify session with backend (tokens in httpOnly cookies sent automatically)
          const userResponse = await authService.getCurrentUser();
          
          if (userResponse.success) {
            // SECURITY: Don't log email addresses - only log in development
            logger.debug('Session restored successfully', { userId: userResponse.user.id, userType: userResponse.user.userType });
            
            // SECURITY: Tokens are in httpOnly cookies, only store user data
            localStorage.setItem('user', JSON.stringify(userResponse.user));
            
            dispatch({
              type: AUTH_ACTIONS.RESTORE_SESSION,
              payload: {
                user: userResponse.user,
                token: null, // Token is in httpOnly cookie, not accessible
                rememberMe
              }
            });
          } else {
            logger.warn('Session invalid, clearing storage', { 
              reason: userResponse.message || 'Backend verification failed' 
            });
            // Session invalid, clear storage
            localStorage.removeItem('authToken'); // Clear for backward compatibility
            localStorage.removeItem('user');
            // Don't call logout() here to avoid unnecessary API call
            // Cookies will be cleared by browser or on next login
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        } else {
          logger.debug('No stored user data found');
          // No stored session, set loading to false
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        logger.error('Session restoration failed', error);
        await authService.logout();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      } finally {
        logger.debug('Session restoration completed');
        // Ensure loading is always set to false, even if there's an error
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    restoreSession();
  }, []);

  // Login function
  const login = useCallback(async (email, password, rememberMe = false, recaptchaToken = null) => {
    try {
      const response = await authService.login(email, password, rememberMe, recaptchaToken);

      if (response.success) {
        logger.debug('Login response user object', { userId: response.user.id, userType: response.user.userType });
        
        // SECURITY: Tokens are in httpOnly cookies (set by backend), only store user data
        localStorage.setItem('user', JSON.stringify(response.user));
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.user,
            token: null, // Token is in httpOnly cookie, not accessible to JavaScript
            rememberMe
          }
        });

        return { success: true, user: response.user };
      } else {
        return { 
          success: false, 
          message: response.message,
          errors: response.errors 
        };
      }
    } catch (error) {
      logger.error('Login error', error, { email });
      
      const errorMessage = error.message || 'An unexpected error occurred during login';
      
      return { 
        success: false, 
        message: errorMessage,
        errors: error.errors || []
      };
    }
  }, []);

  // Logout function
  const logout = useCallback(async (source = 'unknown') => {
    try {
      await authService.logout(source);
      
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      return { success: true };
    } catch (error) {
      logger.error('Logout error', error, { source });
      // Force logout even if API call fails
      
      // Clear localStorage even on error
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      
      return { success: false, message: error.message };
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      
      if (response.success) {
        updateUser(response.user);
        return { success: true, user: response.user };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      logger.error('Get current user error', error);
      return { success: false, message: error.message };
    }
  }, [updateUser]);

  // Helper functions
  const hasRole = useCallback((role) => authService.hasRole(role), []);
  const hasPermission = useCallback((permission) => authService.hasPermission(permission), []);
  const getUserDisplayName = useCallback(() => authService.getUserDisplayName(), []);
  const getUserRoleDisplayName = useCallback(() => authService.getUserRoleDisplayName(), []);

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    rememberMe: state.rememberMe,
    
    // Actions
    login,
    logout,
    updateUser,
    clearError,
    getCurrentUser,
    
    // Helper functions
    hasRole,
    hasPermission,
    getUserDisplayName,
    getUserRoleDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext; 