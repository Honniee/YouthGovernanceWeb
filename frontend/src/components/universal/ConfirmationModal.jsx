import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

/**
 * Universal Confirmation Modal
 * Replaces browser confirm() with beautiful, consistent styling
 * Reusable across entire system for any confirmation needs
 */

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // default, danger, success, warning
  icon = null,
  children = null,
  isLoading = false,
  disabled = false
}) => {
  if (!isOpen) return null;

  // Icon based on variant
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'danger':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  // Button styling based on variant
  const getConfirmButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  const handleConfirm = () => {
    if (disabled || isLoading) return;
    onConfirm();
  };

  const handleCancel = () => {
    if (isLoading) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200/50 transform transition-all duration-300 ease-out">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                variant === 'danger' ? 'bg-red-100' :
                variant === 'success' ? 'bg-green-100' :
                variant === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {getIcon()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">Please confirm your action</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-3">
              {message}
            </p>
            {children && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {children}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={disabled || isLoading}
              className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${getConfirmButtonStyle()}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Convenience function for common confirmation patterns
export const showConfirmation = (options) => {
  return new Promise((resolve) => {
    // This would need to be integrated with a confirmation provider
    // For now, we'll use the component directly
    resolve(window.confirm(options.message)); // Fallback
  });
};

// Common confirmation presets
export const confirmPresets = {
  delete: (itemName) => ({
    title: "Delete Confirmation",
    message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "danger"
  }),
  
  activate: (itemName) => ({
    title: "Activate Confirmation",
    message: `Are you sure you want to activate ${itemName}?`,
    confirmText: "Activate",
    cancelText: "Cancel",
    variant: "success"
  }),
  
  deactivate: (itemName) => ({
    title: "Deactivate Confirmation", 
    message: `Are you sure you want to deactivate ${itemName}?`,
    confirmText: "Deactivate",
    cancelText: "Cancel",
    variant: "warning"
  }),
  
  bulkOperation: (action, count, itemType) => ({
    title: `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)} Confirmation`,
    message: `Are you sure you want to ${action.toLowerCase()} ${count} ${itemType}${count > 1 ? 's' : ''}?`,
    confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    cancelText: "Cancel",
    variant: action.toLowerCase().includes('delete') ? "danger" : "default"
  })
};

export default ConfirmationModal;
