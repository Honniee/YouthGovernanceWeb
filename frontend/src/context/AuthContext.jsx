import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.js';

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
    const restoreSession = async () => {
      try {
        console.log('🔄 Starting session restoration...');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
        
        const storedUser = authService.getStoredUser();
        const storedToken = authService.getStoredToken();
        const rememberMe = authService.getRememberMe();

        console.log('📦 Stored data:', {
          hasUser: !!storedUser,
          hasToken: !!storedToken,
          rememberMe
        });

        if (storedUser && storedToken) {
          console.log('🔐 Found stored session, verifying with backend...');
          // Verify token with backend
          const userResponse = await authService.getCurrentUser();
          
          if (userResponse.success) {
            console.log('✅ Session restored successfully:', userResponse.user.email);
            console.log('🔍 Restored user object:', userResponse.user);
            
            // Store token in localStorage for API interceptor
            localStorage.setItem('authToken', storedToken);
            localStorage.setItem('user', JSON.stringify(userResponse.user));
            
            dispatch({
              type: AUTH_ACTIONS.RESTORE_SESSION,
              payload: {
                user: userResponse.user,
                token: storedToken,
                rememberMe
              }
            });
          } else {
            console.log('❌ Token invalid, clearing session');
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            await authService.logout();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        } else {
          console.log('📭 No stored session found');
          // No stored session, set loading to false
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('💥 Session restoration failed:', error);
        await authService.logout();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      } finally {
        console.log('🏁 Session restoration completed');
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
        console.log('🔍 Login response user object:', response.user);
        
        // Store token in localStorage for API interceptor
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.user,
            token: response.token,
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
      console.error('Login error:', error);
      
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
      console.error('Logout error:', error);
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
      console.error('Get current user error:', error);
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