import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import { useAuth } from '../context/AuthContext';

const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const { token, user } = useAuth?.() || {};

  useEffect(() => {
    connectSocket(() => token);
    const s = getSocket();
    // Join role room client-side (optional; server may auto-join)
    const rooms = [];
    if (user?.role) rooms.push(`role:${String(user.role).toLowerCase()}`);
    if (user?.labels?.includes('Admin')) rooms.push('role:admin');
    if (rooms.length) s.emit('join', { rooms });
    return () => disconnectSocket();
  }, [token, user?.role]);

  const value = useMemo(() => ({ socket: getSocket() }), []);
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeContext = () => useContext(RealtimeContext);


