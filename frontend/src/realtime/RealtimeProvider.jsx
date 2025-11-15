import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket, getConnectionStatus, onStatusChange } from './socket';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger.js';

const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  // SECURITY: With httpOnly cookies, we don't have token in JS, but we can check if user is authenticated
  // The socket will authenticate using cookies automatically (withCredentials: true)
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // If AuthProvider is not available, provide default values
    logger.warn('RealtimeProvider: AuthProvider not available, using defaults');
    authContext = { isAuthenticated: false, user: null };
  }
  
  const { isAuthenticated, user } = authContext;
  const [connectionStatus, setConnectionStatus] = useState(getConnectionStatus());

  useEffect(() => {
    // Update connection status when it changes
    const unsubscribe = onStatusChange(setConnectionStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Connect socket when user is authenticated
    // SECURITY: Token is in httpOnly cookie, socket.io will send it automatically
    if (isAuthenticated && user) {
      // Connect without explicit token - cookies are sent automatically
      const socket = connectSocket(() => null); // Pass null, server will authenticate via cookies
      
      // Join additional rooms if needed (server auto-joins role-based rooms)
      const rooms = [];
      if (user?.barangay_id) {
        rooms.push(`barangay:${user.barangay_id}`);
      }
      if (user?.id) {
        rooms.push(`user:${user.id}`);
      }
      
      if (rooms.length && socket) {
        socket.emit('join', { rooms });
      }

      return () => {
        // Only disconnect if this is the last component using the socket
        // In practice, we usually keep the connection alive
        // disconnectSocket();
      };
    }
  }, [isAuthenticated, user?.id, user?.barangay_id]);

  const value = useMemo(() => ({
    socket: getSocket(),
    connectionStatus,
    isConnected: connectionStatus === 'connected'
  }), [connectionStatus]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeContext = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    logger.warn('useRealtimeContext must be used within RealtimeProvider');
    return { socket: null, connectionStatus: 'disconnected', isConnected: false };
  }
  return context;
};


