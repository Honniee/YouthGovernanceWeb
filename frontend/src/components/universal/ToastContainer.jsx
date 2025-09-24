import React, { useState, useCallback, useEffect } from 'react';
import ToastNotification from './ToastNotification';

/**
 * Universal Toast Container
 * Manages multiple toast notifications and provides a clean API
 * Integrates with all management systems
 */

let toastId = 0;

const ToastContainer = ({ maxToasts = 5, position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast
  const addToast = useCallback((toast) => {
    const id = ++toastId;
    const newToast = {
      id,
      timestamp: Date.now(),
      ...toast
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Limit number of toasts
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Make functions available globally
  useEffect(() => {
    // Attach to window for global access
    window.showToast = addToast;
    window.clearToasts = clearAllToasts;
    
    return () => {
      delete window.showToast;
      delete window.clearToasts;
    };
  }, [addToast, clearAllToasts]);

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            zIndex: 100 - index // Stack toasts properly
          }}
        >
          <ToastNotification
            {...toast}
            onClose={removeToast}
            position={position}
            className={`transition-transform duration-200 ${
              index > 0 ? `transform translate-y-${index * 2}` : ''
            }`}
          />
        </div>
      ))}
    </>
  );
};

// Toast utility functions for easy use across the app
export const showToast = (toast) => {
  if (window.showToast) {
    return window.showToast(toast);
  }
  console.warn('ToastContainer not mounted. Toast:', toast);
  return null;
};

// Convenience methods for different toast types
export const showSuccessToast = (title, message, actions = []) => {
  return showToast({
    type: 'success',
    title,
    message,
    actions,
    duration: 4000
  });
};

export const showErrorToast = (title, message, actions = []) => {
  return showToast({
    type: 'error',
    title,
    message,
    actions,
    duration: 6000
  });
};

export const showWarningToast = (title, message, actions = []) => {
  return showToast({
    type: 'warning',
    title,
    message,
    actions,
    duration: 5000
  });
};

export const showInfoToast = (title, message, actions = []) => {
  return showToast({
    type: 'info',
    title,
    message,
    actions,
    duration: 4000
  });
};

// Staff Management specific toast helpers
export const showStaffSuccessToast = (operation, staffMember, actions = []) => {
  const operationText = {
    'created': 'Staff Member Created',
    'updated': 'Staff Member Updated', 
    'activated': 'Staff Member Activated',
    'deactivated': 'Staff Member Deactivated',
    'deleted': 'Staff Member Deleted',
    'imported': 'Staff Import Completed',
    'exported': 'Staff Export Completed'
  };

  return showSuccessToast(
    operationText[operation] || 'Operation Successful',
    staffMember ? `${staffMember.firstName} ${staffMember.lastName} ${operation} successfully` : 'Operation completed successfully',
    actions
  );
};

// SK Officials specific toast helpers
export const showSKSuccessToast = (operation, skOfficial, actions = []) => {
  const operationText = {
    'created': 'SK Official Created',
    'updated': 'SK Official Updated',
    'activated': 'SK Official Activated', 
    'deactivated': 'SK Official Deactivated',
    'deleted': 'SK Official Deleted',
    'imported': 'SK Officials Import Completed',
    'exported': 'SK Officials Export Completed'
  };

  return showSuccessToast(
    operationText[operation] || 'Operation Successful',
    skOfficial ? `${skOfficial.firstName} ${skOfficial.lastName} (${skOfficial.position}) ${operation} successfully` : 'Operation completed successfully',
    actions
  );
};

// Reports specific toast helpers  
export const showReportSuccessToast = (reportType, recordCount, actions = []) => {
  return showSuccessToast(
    'Report Generated',
    `${reportType} completed successfully (${recordCount} records)`,
    actions
  );
};

export const clearToasts = () => {
  if (window.clearToasts) {
    window.clearToasts();
  }
};

export default ToastContainer;
