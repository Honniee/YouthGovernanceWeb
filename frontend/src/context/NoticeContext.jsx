import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSystemNotice } from '../services/systemNoticeService';
import { useRealtime } from '../realtime/useRealtime';

const NoticeContext = createContext();

export const useNotice = () => {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error('useNotice must be used within a NoticeProvider');
  }
  return context;
};

export const NoticeProvider = ({ children }) => {
  const [showNotice, setShowNotice] = useState(false);
  const [notice, setNotice] = useState({
    enabled: false,
    text: '',
    type: 'info',
    dismissible: true,
    expiresAt: null,
    adminOverride: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await getSystemNotice();
        if (resp?.success && resp?.data) {
          setNotice(resp.data);
          // Respect expiration: if expired, don't show
          const isExpired = resp.data.expiresAt ? (new Date(resp.data.expiresAt).getTime() < Date.now()) : false;
          if (isExpired) {
            setShowNotice(false);
            return;
          }

          // Show if enabled and (admin override OR non-dismissible OR not dismissed)
          const dismissedAt = localStorage.getItem('noticeDismissedAt');
          const dismissForHours = 1; // show again after 1 hour
          const expiredDismiss = !dismissedAt || (Date.now() - Number(dismissedAt)) > dismissForHours * 3600000;
          const adminOverride = Boolean(resp.data.adminOverride);
          const nonDismissible = resp.data.dismissible === false;

          // If admin set to non-dismissible, clear any previous dismissal timestamp
          if (nonDismissible && dismissedAt) {
            localStorage.removeItem('noticeDismissedAt');
          }

          setShowNotice(Boolean(resp.data.enabled) && (adminOverride || nonDismissible || expiredDismiss));
        } else {
          setShowNotice(false);
        }
      } catch (e) {
        setError(e);
        setShowNotice(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Realtime: refresh notice on broadcast
  useRealtime('systemNotice:changed', async () => {
    try {
      const resp = await getSystemNotice();
      if (resp?.success && resp?.data) {
        setNotice(resp.data);
        const isExpired = resp.data.expiresAt ? (new Date(resp.data.expiresAt).getTime() < Date.now()) : false;
        if (isExpired) {
          setShowNotice(false);
          return;
        }
        const dismissedAt = localStorage.getItem('noticeDismissedAt');
        const dismissForHours = 1;
        const expiredDismiss = !dismissedAt || (Date.now() - Number(dismissedAt)) > dismissForHours * 3600000;
        const adminOverride = Boolean(resp.data.adminOverride);
        const nonDismissible = resp.data.dismissible === false;
        if (nonDismissible && dismissedAt) localStorage.removeItem('noticeDismissedAt');
        setShowNotice(Boolean(resp.data.enabled) && (adminOverride || nonDismissible || expiredDismiss));
      }
    } catch (_) {}
  });

  const value = useMemo(() => ({ showNotice, setShowNotice, notice, setNotice, loading, error }), [showNotice, notice, loading, error]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
    </NoticeContext.Provider>
  );
};

export default NoticeContext; 