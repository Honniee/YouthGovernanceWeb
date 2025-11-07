import { useEffect } from 'react';
import { getSocket } from './socket';

export function useRealtime(event, handler) {
  useEffect(() => {
    const s = getSocket();
    if (!s || !event || !handler) return;
    s.on(event, handler);
    return () => { try { s.off(event, handler); } catch (_) {} };
  }, [event, handler]);
}


