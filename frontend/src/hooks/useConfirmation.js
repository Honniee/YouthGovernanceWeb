import { useState, useCallback } from 'react';

/**
 * Custom Hook for Managing Confirmation Modals
 * Provides a clean API to replace browser confirm() dialogs
 * Integrates seamlessly with the ConfirmationModal component
 */

const useConfirmation = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    icon: null,
    onConfirm: null,
    onCancel: null,
    isLoading: false,
    disabled: false
  });

  // Show confirmation modal
  const showConfirmation = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        icon: options.icon || null,
        isLoading: false,
        disabled: false,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isLoading: true }));
          resolve(true);
        },
        onCancel: () => {
          hideConfirmation();
          resolve(false);
        }
      });
    });
  }, []);

  // Hide confirmation modal
  const hideConfirmation = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
      isLoading: false
    }));
  }, []);

  // Set loading state
  const setLoading = useCallback((loading) => {
    setModalState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // Confirm action and close modal
  const confirmAction = useCallback(() => {
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
  }, [modalState.onConfirm]);

  // Cancel action and close modal
  const cancelAction = useCallback(() => {
    if (modalState.onCancel) {
      modalState.onCancel();
    } else {
      hideConfirmation();
    }
  }, [modalState.onCancel, hideConfirmation]);

  // Convenience methods for common confirmation types
  const confirmDelete = useCallback((itemName) => {
    return showConfirmation({
      title: "Delete Confirmation",
      message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger"
    });
  }, [showConfirmation]);

  const confirmActivate = useCallback((itemName) => {
    return showConfirmation({
      title: "Activate Confirmation",
      message: `Are you sure you want to activate ${itemName}?`,
      confirmText: "Activate",
      cancelText: "Cancel", 
      variant: "success"
    });
  }, [showConfirmation]);

  const confirmDeactivate = useCallback((itemName) => {
    return showConfirmation({
      title: "Deactivate Confirmation",
      message: `Are you sure you want to deactivate ${itemName}?`,
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "warning"
    });
  }, [showConfirmation]);

  const confirmComplete = useCallback((itemName) => {
    return showConfirmation({
      title: "Complete Confirmation",
      message: `Are you sure you want to complete ${itemName}? This will mark the term as finished.`,
      confirmText: "Complete",
      cancelText: "Cancel",
      variant: "warning"
    });
  }, [showConfirmation]);

  const confirmForceComplete = useCallback((itemName) => {
    return showConfirmation({
      title: "Force Complete Confirmation",
      message: `Are you sure you want to force complete ${itemName}? This will immediately end the term and update the end date to today. All officials will lose account access immediately.`,
      confirmText: "Force Complete",
      cancelText: "Cancel",
      variant: "danger"
    });
  }, [showConfirmation]);

  const confirmArchive = useCallback((message, onConfirm) => {
    return showConfirmation({
      title: "Archive Confirmation",
      message: message || "Are you sure you want to archive this item?",
      confirmText: "Archive",
      cancelText: "Cancel",
      variant: "warning"
    }).then(async (confirmed) => {
      if (confirmed && onConfirm) {
        try {
          await onConfirm();
        } finally {
          hideConfirmation();
        }
      }
    });
  }, [showConfirmation, hideConfirmation]);

  const confirmRestore = useCallback((message, onConfirm) => {
    return showConfirmation({
      title: "Restore Confirmation",
      message: message || "Are you sure you want to restore this item?",
      confirmText: "Restore",
      cancelText: "Cancel",
      variant: "success"
    }).then(async (confirmed) => {
      if (confirmed && onConfirm) {
        try {
          await onConfirm();
        } finally {
          hideConfirmation();
        }
      }
    });
  }, [showConfirmation, hideConfirmation]);

  const confirmBulkOperation = useCallback((action, count, itemType) => {
    const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
    
    // Determine the appropriate variant based on action
    let variant = "default";
    if (action.toLowerCase().includes('delete')) {
      variant = "danger";
    } else if (action.toLowerCase().includes('deactivate')) {
      variant = "warning";
    } else if (action.toLowerCase().includes('activate')) {
      variant = "success";
    }
    
    return showConfirmation({
      title: `Bulk ${capitalizedAction} Confirmation`,
      message: `Are you sure you want to ${action.toLowerCase()} ${count} ${itemType}${count > 1 ? 's' : ''}?`,
      confirmText: capitalizedAction,
      cancelText: "Cancel",
      variant: variant
    });
  }, [showConfirmation]);

  return {
    // Modal state and props
    modalProps: {
      isOpen: modalState.isOpen,
      title: modalState.title,
      message: modalState.message,
      confirmText: modalState.confirmText,
      cancelText: modalState.cancelText,
      variant: modalState.variant,
      icon: modalState.icon,
      isLoading: modalState.isLoading,
      disabled: modalState.disabled,
      onConfirm: confirmAction,
      onClose: cancelAction
    },
    
    // Control methods
    showConfirmation,
    hideConfirmation,
    setLoading,
    
    // Convenience methods
    confirmDelete,
    confirmActivate, 
    confirmDeactivate,
    confirmComplete,
    confirmForceComplete,
    confirmArchive,
    confirmRestore,
    confirmBulkOperation
  };
};

export default useConfirmation;
