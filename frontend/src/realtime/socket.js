import { io } from 'socket.io-client';
import logger from '../utils/logger.js';

let socket = null;
let connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'error'
const statusListeners = new Set();

/**
 * Enhanced WebSocket Client with Connection Status Tracking
 */

export function connectSocket(getToken) {
  // Disconnect existing connection if any
  if (socket?.connected) {
    socket.disconnect();
  }

  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/?api\/?$/, '') || 
               window.location.origin.replace(/:\d+$/, ':3001');

  // SECURITY: With httpOnly cookies, token is sent automatically via cookies
  // Only include auth.token if a token is provided (for backward compatibility)
  const token = typeof getToken === 'function' ? getToken() : getToken;
  const socketConfig = {
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
    // SECURITY: Send cookies automatically (for httpOnly cookie authentication)
    withCredentials: true
  };

  // Only add auth.token if token is provided (backward compatibility)
  if (token) {
    socketConfig.auth = { token };
  }

  socket = io(base, socketConfig);

  // Connection status tracking
  socket.on('connect', () => {
    connectionStatus = 'connected';
    updateStatusListeners();
    logger.socket('connected', { socketId: socket.id });
  });

  socket.on('disconnect', (reason) => {
    connectionStatus = reason === 'io server disconnect' ? 'disconnected' : 'connecting';
    updateStatusListeners();
    logger.socket('disconnected', { reason });
  });

  socket.on('connect_error', (error) => {
    connectionStatus = 'error';
    updateStatusListeners();
    logger.error('WebSocket connection error', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    connectionStatus = 'connected';
    updateStatusListeners();
    logger.socket('reconnected', { attemptNumber });
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    connectionStatus = 'connecting';
    updateStatusListeners();
    logger.debug(`WebSocket reconnection attempt ${attemptNumber}`);
  });

  socket.on('reconnect_failed', () => {
    connectionStatus = 'error';
    updateStatusListeners();
    logger.error('WebSocket reconnection failed', null, {});
  });

  return socket;
}

export function getSocket() { 
  return socket; 
}

export function getConnectionStatus() {
  return connectionStatus;
}

export function onStatusChange(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function updateStatusListeners() {
  statusListeners.forEach(listener => listener(connectionStatus));
}

export function disconnectSocket() { 
  try { 
    if (socket) {
      socket.disconnect();
      socket = null;
      connectionStatus = 'disconnected';
      updateStatusListeners();
    }
  } catch (error) {
    logger.error('Error disconnecting socket', error);
  }
}

export function isConnected() {
  return socket?.connected || false;
}


