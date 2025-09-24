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
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  // Button styling based on variant
  const getConfirmButtonStyle = () => {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (variant) {
      case 'danger':
        return `${baseStyle} bg-red-600 hover:bg-red-700 text-white`;
      case 'success':
        return `${baseStyle} bg-green-600 hover:bg-green-700 text-white`;
      case 'warning':
        return `${baseStyle} bg-yellow-600 hover:bg-yellow-700 text-white`;
      default:
        return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs sm:max-w-md mx-2 sm:mx-4 transform transition-all duration-200 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {getIcon()}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {message}
          </p>
          {children && (
            <div className="mt-3 sm:mt-4">
              {children}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 order-2 sm:order-1"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={disabled || isLoading}
            className={`w-full sm:w-auto text-sm font-medium order-1 sm:order-2 ${getConfirmButtonStyle()}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
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
