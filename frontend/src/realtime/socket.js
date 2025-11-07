import { io } from 'socket.io-client';

let socket;

export function connectSocket(getToken) {
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/?api\/?$/, '') || window.location.origin.replace(/:\d+$/, ':3001');
  socket = io(base, {
    transports: ['websocket'],
    auth: {
      token: typeof getToken === 'function' ? getToken() : getToken
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });
  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() { try { socket?.disconnect(); } catch (_) {} }


