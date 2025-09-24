import { useState, useCallback } from 'react';

/**
 * Custom hook for managing export operations
 * Provides consistent export state management and error handling
 */
const useExport = ({
  exportFunction, // Function that handles the actual export: (format, ...args) => Promise
  onSuccess,
  onError,
  onStart,
  onComplete
} = {}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [lastExportFormat, setLastExportFormat] = useState(null);

  // Handle export operation
  const handleExport = useCallback(async (format, ...args) => {
    if (!exportFunction) {
      console.warn('useExport: No export function provided');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setLastExportFormat(format);

    try {
      onStart?.(format, ...args);
      
      const result = await exportFunction(format, ...args);
      
      onSuccess?.(result, format, ...args);
      
      return result;
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error);
      onError?.(error, format, ...args);
      throw error;
    } finally {
      setIsExporting(false);
      onComplete?.(format, ...args);
    }
  }, [exportFunction, onSuccess, onError, onStart, onComplete]);

  // Reset export state
  const resetExport = useCallback(() => {
    setIsExporting(false);
    setExportError(null);
    setLastExportFormat(null);
  }, []);

  // Get export status
  const getExportStatus = useCallback(() => {
    if (isExporting) return 'exporting';
    if (exportError) return 'error';
    if (lastExportFormat) return 'success';
    return 'idle';
  }, [isExporting, exportError, lastExportFormat]);

  return {
    // State
    isExporting,
    exportError,
    lastExportFormat,
    
    // Actions
    handleExport,
    resetExport,
    
    // Helpers
    exportStatus: getExportStatus(),
    hasError: !!exportError,
    hasExported: !!lastExportFormat
  };
};

/**
 * Hook for staff export operations
 * Specifically configured for staff management exports
 */
export const useStaffExport = ({
  staffService,
  statusFilter = 'all',
  onSuccess,
  onError
} = {}) => {
  const exportFunction = useCallback(async (format, style = null) => {
    if (!staffService) {
      throw new Error('Staff service is required');
    }
    
    console.log('Starting export with format:', format, 'style:', style, 'statusFilter:', statusFilter);
    const response = await staffService.exportStaff(format, statusFilter, [], style);
    
    if (!response.success) {
      throw new Error(response.message || 'Export failed');
    }
    
    return response;
  }, [staffService, statusFilter]);

  return useExport({
    exportFunction,
    onSuccess: (result, format) => {
      console.log('Export completed successfully:', format);
      onSuccess?.(result, format);
    },
    onError: (error, format) => {
      console.error('Export failed:', format, error);
      onError?.(error, format);
    },
    onStart: (format) => {
      console.log('Export started:', format);
    }
  });
};

/**
 * Hook for bulk export operations
 * Configured for bulk staff operations
 */
export const useBulkExport = ({
  staffService,
  selectedItems = [],
  statusFilter = 'all',
  onSuccess,
  onError
} = {}) => {
  const exportFunction = useCallback(async (format, style = null) => {
    if (!staffService) {
      throw new Error('Staff service is required');
    }
    
    // If items are selected, export only selected items
    // Otherwise, export based on current filter
    if (selectedItems.length > 0) {
      console.log('Starting bulk export for selected items:', selectedItems, 'format:', format, 'style:', style);
      const response = await staffService.exportStaff(format, statusFilter, selectedItems, style);
      
      if (!response.success) {
        throw new Error(response.message || 'Bulk export failed');
      }
      
      return response;
    } else {
      console.log('Starting bulk export for all items with filter:', statusFilter, 'format:', format, 'style:', style);
      const response = await staffService.exportStaff(format, statusFilter, [], style);
      
      if (!response.success) {
        throw new Error(response.message || 'Bulk export failed');
      }
      
      return response;
    }
  }, [staffService, selectedItems, statusFilter]);

  return useExport({
    exportFunction,
    onSuccess: (result, format) => {
      const itemCount = selectedItems.length > 0 ? selectedItems.length : 'all';
      console.log(`Bulk export completed successfully: ${itemCount} items as ${format}`);
      onSuccess?.(result, format);
    },
    onError: (error, format) => {
      console.error('Bulk export failed:', format, error);
      onError?.(error, format);
    }
  });
};

export default useExport;
