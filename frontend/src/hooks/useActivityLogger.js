import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast, showWarningToast, showStaffSuccessToast, showSKSuccessToast } from '../components/universal/ToastContainer';

/**
 * Universal Activity Logger Hook
 * Provides automatic success/error handling with toast notifications and data refresh
 * Works with all management systems (Staff, SK Officials, SK Terms, Reports)
 */

const useActivityLogger = (entityType, options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(null);

  // Default options
  const defaultOptions = {
    autoRefresh: true,
    showToasts: true,
    logActivity: true,
    ...options
  };

  /**
   * Main activity logging function
   * @param {string} operation - The operation being performed ('create', 'update', 'delete', 'activate', etc.)
   * @param {object} data - Data for the operation
   * @param {object} config - Configuration for this specific operation
   */
  const logActivity = useCallback(async (operation, data, config = {}) => {
    const {
      onSuccess,
      onError,
      onFinally,
      successTitle,
      successMessage,
      errorTitle,
      errorMessage,
      showSuccessToast: showSuccess = defaultOptions.showToasts,
      showErrorToast: showError = defaultOptions.showToasts,
      autoRefresh = defaultOptions.autoRefresh,
      refreshCallback,
      actions = []
    } = config;

    setIsLoading(true);
    
    try {
      let result;
      
      // Execute the operation based on entity type and operation
      switch (entityType) {
        case 'staff':
          result = await handleStaffOperation(operation, data, config);
          break;
        case 'sk-officials':
          result = await handleSKOperation(operation, data, config);
          break;
        case 'sk-terms':
          result = await handleSKTermsOperation(operation, data, config);
          break;
        case 'reports':
          result = await handleReportsOperation(operation, data, config);
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      // Handle success
      if (result && result.success) {
        const activity = {
          entityType,
          operation,
          data,
          result,
          timestamp: new Date().toISOString()
        };
        
        setLastActivity(activity);

        // Show success toast
        if (showSuccess) {
          if (entityType === 'staff') {
            showStaffSuccessToast(operation, data, actions);
          } else if (entityType === 'sk-officials') {
            showSKSuccessToast(operation, data, actions);
          } else {
            showSuccessToast(
              successTitle || `${operation.charAt(0).toUpperCase() + operation.slice(1)} Successful`,
              successMessage || `${entityType} ${operation} completed successfully`,
              actions
            );
          }
        }

        // Auto-refresh data
        if (autoRefresh && refreshCallback) {
          await refreshCallback();
        }

        // Execute success callback
        if (onSuccess) {
          await onSuccess(result, activity);
        }

        return result;
      } else {
        throw new Error(result?.message || 'Operation failed');
      }

    } catch (error) {
      console.error(`${entityType} ${operation} error:`, error);

      // Show error toast
      if (showError) {
        showErrorToast(
          errorTitle || `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
          errorMessage || error.message || `Failed to ${operation} ${entityType}`,
          actions
        );
      }

      // Execute error callback
      if (onError) {
        await onError(error);
      }

      throw error;
    } finally {
      setIsLoading(false);
      
      // Execute finally callback
      if (onFinally) {
        await onFinally();
      }
    }
  }, [entityType, defaultOptions]);

  // Entity-specific operation handlers
  const handleStaffOperation = async (operation, data, config) => {
    // Import staff service dynamically to avoid circular dependencies
    const { default: staffService } = await import('../services/staffService');
    
    switch (operation) {
      case 'create':
        return await staffService.createStaff(data);
      case 'update':
        return await staffService.updateStaff(data.id, data);
      case 'delete':
        return await staffService.deleteStaff(data.id);
      case 'activate':
      case 'deactivate':
        return await staffService.updateStaffStatus(data.id, operation === 'activate' ? 'active' : 'deactivated', data.reason);
      case 'bulkUpdate':
        return await staffService.bulkUpdateStatus(data.ids, data.action);
      case 'export':
        return await staffService.exportStaff(data.format, data.status, data.selectedIds);
      default:
        throw new Error(`Unsupported staff operation: ${operation}`);
    }
  };

  const handleSKOperation = async (operation, data, config) => {
    // Import SK service dynamically  
    const { default: skService } = await import('../services/skService');
    
    switch (operation) {
      case 'create':
        return await skService.createSKOfficial(data);
      case 'update':
        return await skService.updateSKOfficial(data.id, data);
      case 'delete':
        return await skService.deleteSKOfficial(data.id);
      case 'activate':
      case 'deactivate':
        return await skService.updateSKStatus(data.id, operation === 'activate' ? 'active' : 'inactive');
      case 'bulkUpdate':
        return await skService.bulkUpdateStatus(data.ids, data.action);
      case 'export':
        return await skService.exportSKOfficials(data.format, data.status, data.selectedIds);
      default:
        throw new Error(`Unsupported SK operation: ${operation}`);
    }
  };

  const handleSKTermsOperation = async (operation, data, config) => {
    // Import SK Terms service dynamically
    const { default: skTermsService } = await import('../services/skTermsService');
    
    switch (operation) {
      case 'create':
        return await skTermsService.createTerm(data);
      case 'update':
        return await skTermsService.updateTerm(data.id, data);
      case 'delete':
        return await skTermsService.deleteTerm(data.id);
      case 'activate':
        return await skTermsService.activateTerm(data.id);
      case 'deactivate':
        return await skTermsService.deactivateTerm(data.id);
      default:
        throw new Error(`Unsupported SK Terms operation: ${operation}`);
    }
  };

  const handleReportsOperation = async (operation, data, config) => {
    // Reports service doesn't exist yet, so we'll create a placeholder
    // This can be implemented when reports functionality is added
    
    switch (operation) {
      case 'export':
        console.log('📊 Reports export operation:', data);
        return { success: true, message: 'Report export completed' };
      case 'generate':
        console.log('📊 Reports generate operation:', data);
        return { success: true, message: 'Report generated successfully' };
      default:
        throw new Error(`Unsupported reports operation: ${operation}`);
    }
  };

  // Convenience methods for common operations
  const createEntity = useCallback((data, config = {}) => {
    return logActivity('create', data, config);
  }, [logActivity]);

  const updateEntity = useCallback((id, data, config = {}) => {
    return logActivity('update', { id, ...data }, config);
  }, [logActivity]);

  const deleteEntity = useCallback((id, config = {}) => {
    return logActivity('delete', { id }, config);
  }, [logActivity]);

  const activateEntity = useCallback((id, config = {}) => {
    return logActivity('activate', { id }, config);
  }, [logActivity]);

  const deactivateEntity = useCallback((id, reason = '', config = {}) => {
    return logActivity('deactivate', { id, reason }, config);
  }, [logActivity]);

  const bulkUpdateEntities = useCallback((ids, action, config = {}) => {
    return logActivity('bulkUpdate', { ids, action }, config);
  }, [logActivity]);

  const exportEntities = useCallback((format, status = 'all', selectedIds = null, config = {}) => {
    return logActivity('export', { format, status, selectedIds }, config);
  }, [logActivity]);

  return {
    // Main function
    logActivity,
    
    // State
    isLoading,
    lastActivity,
    
    // Convenience methods
    createEntity,
    updateEntity, 
    deleteEntity,
    activateEntity,
    deactivateEntity,
    bulkUpdateEntities,
    exportEntities,
    
    // Utility
    clearActivity: () => setLastActivity(null)
  };
};

export default useActivityLogger;
