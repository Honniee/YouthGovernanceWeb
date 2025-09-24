import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';

/**
 * BulkModal Component - Reusable bulk operations modal
 * Supports configurable actions, confirmation flow, and progress indication
 */
const BulkModal = ({
  isOpen = false,
  onClose,
  title = 'Bulk Operations',
  selectedCount = 0,
  actions = [],
  selectedAction = '',
  onActionChange,
  onExecute,
  isProcessing = false,
  requireConfirmation = true,
  showProgress = false,
  progress = 0,
  progressText = '',
  additionalFields = [],
  fieldValues = {},
  onFieldChange,
  className = '',
  ...props
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [localFieldValues, setLocalFieldValues] = useState(fieldValues);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isProcessing) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isProcessing]);

  // Handle action selection
  const handleActionChange = (actionId) => {
    onActionChange?.(actionId);
    setShowConfirmation(false);
  };

  // Handle field value change
  const handleFieldChange = (fieldId, value) => {
    const newValues = { ...localFieldValues, [fieldId]: value };
    setLocalFieldValues(newValues);
    onFieldChange?.(newValues);
  };

  // Handle execute action
  const handleExecute = () => {
    if (requireConfirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    onExecute?.(selectedAction, localFieldValues);
  };

  // Handle cancel
  const handleCancel = () => {
    if (isProcessing) return; // Prevent canceling during processing
    
    setShowConfirmation(false);
    setLocalFieldValues({});
    onClose?.();
  };

  // Get selected action details
  const selectedActionDetails = actions.find(action => action.id === selectedAction);

  // Render field based on type
  const renderField = (field) => {
    const value = localFieldValues[field.id] || field.defaultValue || '';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
            required={field.required}
          >
            {field.placeholder && (
              <option value="">{field.placeholder}</option>
            )}
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isProcessing}
            required={field.required}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              disabled={isProcessing}
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
            required={field.required}
          />
        );
    }
  };

  // Get relevant additional fields for selected action
  const relevantFields = additionalFields.filter(field => 
    !field.showFor || field.showFor.includes(selectedAction)
  );

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={!isProcessing ? handleCancel : undefined}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
        {/* Selection Summary */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold text-sm">{selectedCount}</span>
            </div>
            <span>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
              <span className="text-sm font-medium text-gray-900">Processing...</span>
            </div>
            
            {showProgress && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {progressText && (
                  <p className="text-xs text-gray-600">{progressText}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Action Selection */}
        {!isProcessing && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an action</option>
              {actions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Additional Fields */}
        {!isProcessing && relevantFields.length > 0 && selectedAction && (
          <div className="mb-6 space-y-4">
            {relevantFields.map((field) => (
              <div key={field.id}>
                {field.type !== 'checkbox' && (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {field.description && (
                  <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Warning */}
        {showConfirmation && selectedActionDetails && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                  Confirm Action
                </h4>
                <p className="text-sm text-yellow-700">
                  {selectedActionDetails.confirmationMessage || 
                   `Are you sure you want to ${selectedActionDetails.label.toLowerCase()} ${selectedCount} item${selectedCount !== 1 ? 's' : ''}?`}
                </p>
                {selectedActionDetails.destructive && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    This action cannot be undone.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!isProcessing && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={!selectedAction}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${showConfirmation 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {showConfirmation ? (
                <>
                  <Check className="w-4 h-4 mr-1 inline" />
                  Confirm
                </>
              ) : (
                'Execute'
              )}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BulkModal;


