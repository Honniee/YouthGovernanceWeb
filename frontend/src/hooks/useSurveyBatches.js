import { useState, useEffect, useCallback, useRef } from 'react';
import surveyBatchesService from '../services/surveyBatchesService';
import { showSuccessToast, showErrorToast, showInfoToast } from '../components/universal';
import logger from '../utils/logger.js';

/**
 * Custom hook for Survey Batches management
 * Provides state management, API integration, and auto-update functionality
 */
export const useSurveyBatches = (options = {}) => {
  const {
    autoUpdate = true,
    autoUpdateInterval = 5 * 60 * 1000, // 5 minutes
    autoApply = true,
    initialPageSize = 10,
    includeStats = false
  } = options;

  // State management
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0
  });
  
  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Auto-update state
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const autoUpdateIntervalRef = useRef(null);
  
  // Refs to track current values for loadBatches
  const currentFiltersRef = useRef(filters);
  const currentPaginationRef = useRef(pagination);
  const currentIncludeStatsRef = useRef(includeStats);

  // Helpers
  const isKKName = useCallback((name) => {
    if (!name) return false;
    const lower = String(name).toLowerCase();
    return (
      lower.includes('katipunan ng kabataan') ||
      lower.includes('kk survey') ||
      lower.includes('kk ')
    );
  }, []);

  const computeSuggestedStatus = useCallback((batch) => {
    if (!batch?.start_date || !batch?.end_date || !batch?.status) return null;
    if (batch.status === 'paused') return null; // do not auto-transition paused

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(batch.start_date);
    const endDate = new Date(batch.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Draft → Active when today is on/after start (and before/equal end)
    if (batch.status === 'draft' && today >= startDate && today <= endDate) {
      return 'active';
    }

    // Active → Closed when today is after end
    if (batch.status === 'active' && today > endDate) {
      return 'closed';
    }

    return null;
  }, []);

  /**
   * Load survey batches from API
   */
  const loadBatches = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        page: currentPaginationRef.current.page,
        pageSize: currentPaginationRef.current.pageSize,
        includeStats: currentIncludeStatsRef.current,
        ...currentFiltersRef.current,
        ...params
      };

      logger.debug('Hook - loadBatches called', { queryParams, currentFilters: currentFiltersRef.current });

      const result = await surveyBatchesService.getSurveyBatches(queryParams);

      if (result.success) {
        setBatches(result.data.data);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
        showErrorToast('Failed to load survey batches', result.error);
      }
    } catch (err) {
      setError('Failed to load survey batches');
      showErrorToast('Error', 'Failed to load survey batches');
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies to avoid circular updates

  /**
   * Create a new survey batch
   */
  const createBatch = useCallback(async (batchData) => {
    setLoading(true);
    
    try {
      // Client-side validation
      const validation = surveyBatchesService.validateBatchData(batchData);
      if (!validation.isValid) {
        showErrorToast('Validation Error', validation.errors.join(', '));
        return { success: false, errors: validation.errors };
      }

      const result = await surveyBatchesService.createSurveyBatch(batchData);

      if (result.success) {
        showSuccessToast('Success', result.message);
        await loadBatches(); // Reload batches
        return { success: true, data: result.data };
      } else {
        showErrorToast('Creation Failed', result.error);
        return result;
      }
    } catch (err) {
      showErrorToast('Error', 'Failed to create survey batch');
      return { success: false, error: 'Failed to create survey batch' };
    } finally {
      setLoading(false);
    }
  }, []); // Remove loadBatches dependency

  /**
   * Update a survey batch
   */
  const updateBatch = useCallback(async (batchId, updateData) => {
    setLoading(true);
    
    try {
      const result = await surveyBatchesService.updateSurveyBatch(batchId, updateData);

      if (result.success) {
        showSuccessToast('Success', result.message);
        
        // Update local state optimistically
        setBatches(prev => prev.map(batch => 
          batch.batchId === batchId 
            ? { ...batch, ...result.data }
            : batch
        ));
        
        return { success: true, data: result.data };
      } else {
        showErrorToast('Update Failed', result.error);
        return result;
      }
    } catch (err) {
      showErrorToast('Error', 'Failed to update survey batch');
      return { success: false, error: 'Failed to update survey batch' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a survey batch
   */
  const deleteBatch = useCallback(async (batchId) => {
    setLoading(true);
    
    try {
      const result = await surveyBatchesService.deleteSurveyBatch(batchId);

      if (result.success) {
        showSuccessToast('Success', result.message);
        
        // Remove from local state
        setBatches(prev => prev.filter(batch => batch.batchId !== batchId));
        
        return { success: true };
      } else {
        showErrorToast('Deletion Failed', result.error);
        return result;
      }
    } catch (err) {
      showErrorToast('Error', 'Failed to delete survey batch');
      return { success: false, error: 'Failed to delete survey batch' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update batch status with optimistic updates
   */
  const updateBatchStatus = useCallback(async (batchId, status, action, reason = '') => {
    try {
      // Enforce single active KK survey on client side
      if (status === 'active') {
        const target = batches.find(b => b.batchId === batchId || b.batch_id === batchId);
        const targetName = target?.batchName || target?.batch_name;
        if (isKKName(targetName)) {
          const alreadyActiveKK = batches.some(b => {
            const bName = b.batchName || b.batch_name;
            return b.status === 'active' && isKKName(bName) && (b.batchId !== batchId && b.batch_id !== batchId);
          });
          if (alreadyActiveKK) {
            showErrorToast('Activation Blocked', 'Only one KK survey can be active at a time.');
            return { success: false, error: 'Single Active KK rule' };
          }
        }
      }

      // Optimistic update
      setBatches(prev => prev.map(batch => 
        batch.batchId === batchId 
          ? { 
              ...batch, 
              status,
              ...(action === 'pause' && reason && {
                pausedAt: new Date().toISOString(),
                pausedReason: reason
              }),
              ...(action === 'resume' && {
                pausedAt: null,
                pausedReason: null,
                resumedAt: new Date().toISOString()
              })
            }
          : batch
      ));

      const result = await surveyBatchesService.updateBatchStatus(batchId, status, action, reason);

      if (result.success) {
        showSuccessToast('Success', result.message);
        
        // Update with server response
        setBatches(prev => prev.map(batch => 
          batch.batchId === batchId 
            ? { ...batch, ...result.data }
            : batch
        ));
        
        return { success: true, data: result.data };
      } else {
        // Revert optimistic update on failure
        await loadBatches();
        showErrorToast('Status Update Failed', result.error);
        return result;
      }
    } catch (err) {
      // Revert optimistic update on error
      await loadBatches();
      showErrorToast('Error', 'Failed to update batch status');
      return { success: false, error: 'Failed to update batch status' };
    }
  }, []); // Remove loadBatches dependency

  /**
   * Force-activate a batch: sets status to active and adjusts start date to today if needed
   */
  const forceActivate = useCallback(async (batchId) => {
    const target = batches.find(b => b.batchId === batchId || b.batch_id === batchId);
    if (!target) return { success: false, error: 'Batch not found' };

    // Adjust start date to today if in the future
    const todayIso = new Date().toISOString().slice(0, 10);
    const startDate = (target.startDate || target.start_date || '').slice(0, 10);
    const needsStartAdjust = !startDate || new Date(startDate) > new Date(todayIso);

    if (needsStartAdjust) {
      await updateBatch(target.batchId || target.batch_id, { startDate: todayIso });
    }

    return updateBatchStatus(batchId, 'active', 'force-activate');
  }, [batches, updateBatchStatus, updateBatch]);

  /**
   * Force-close a batch: sets status to closed and adjusts end date to today
   */
  const forceClose = useCallback(async (batchId) => {
    const target = batches.find(b => b.batchId === batchId || b.batch_id === batchId);
    if (!target) return { success: false, error: 'Batch not found' };

    const todayIso = new Date().toISOString().slice(0, 10);
    await updateBatch(target.batchId || target.batch_id, { endDate: todayIso });
    return updateBatchStatus(batchId, 'closed', 'force-close');
  }, [batches, updateBatchStatus, updateBatch]);

  /**
   * Pause a survey batch
   */
  const pauseBatch = useCallback(async (batchId, reason) => {
    return updateBatchStatus(batchId, 'active', 'pause', reason);
  }, [updateBatchStatus]);

  /**
   * Resume a survey batch
   */
  const resumeBatch = useCallback(async (batchId) => {
    return updateBatchStatus(batchId, 'active', 'resume');
  }, [updateBatchStatus]);

  /**
   * Check for batches needing automatic status updates
   */
  const checkForAutoUpdates = useCallback(async () => {
    try {
      const updates = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const batch of batches) {
        const suggested = computeSuggestedStatus({
          status: batch.status,
          start_date: batch.startDate || batch.start_date,
          end_date: batch.endDate || batch.end_date
        });

        if (!suggested) continue;

        // Enforce single active KK when suggesting activation
        if (suggested === 'active') {
          const name = batch.batchName || batch.batch_name;
          if (isKKName(name)) {
            const kkActiveExists = batches.some(b => {
              const bName = b.batchName || b.batch_name;
              return b.status === 'active' && isKKName(bName) && (b.batchId !== batch.batchId && b.batch_id !== batch.batch_id);
            });
            if (kkActiveExists) continue; // skip suggesting this activation
          }
        }

        updates.push({ batchId: batch.batchId || batch.batch_id, suggestedStatus: suggested });
      }

      setLastUpdateCheck(new Date());

      if (updates.length > 0) {
        setPendingUpdates(updates);
        showInfoToast('Status Updates Available', `${updates.length} batch(es) can be automatically updated`);
      }

      return updates;
    } catch (err) {
      logger.error('Auto-update check failed', err);
      return [];
    }
  }, [batches, computeSuggestedStatus, isKKName]);

  /**
   * Apply pending auto-updates
   */
  const applyAutoUpdates = useCallback(async () => {
    if (pendingUpdates.length === 0) return;

    try {
      for (const update of pendingUpdates) {
        await updateBatchStatus(
          update.batchId, 
          update.suggestedStatus, 
          'auto-update'
        );
      }
      
      setPendingUpdates([]);
      showSuccessToast('Auto-Update Complete', 'Batch statuses updated automatically');
    } catch (err) {
      showErrorToast('Auto-Update Failed', 'Failed to apply automatic updates');
    }
  }, [pendingUpdates, updateBatchStatus]);

  /**
   * Search and filter functions
   */
  const updateFilters = useCallback((newFilters) => {
    logger.debug('Hook - updateFilters called', { newFilters });
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      logger.debug('Hook - Filters updated', { from: prev, to: updated });
      return updated;
    });
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const updatePagination = useCallback((newPagination) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  /**
   * Utility functions
   */
  const getBatchById = useCallback((batchId) => {
    return batches.find(batch => batch.batchId === batchId);
  }, [batches]);

  const getActiveBatches = useCallback(() => {
    return batches.filter(batch => batch.status === 'active');
  }, [batches]);

  const getDraftBatches = useCallback(() => {
    return batches.filter(batch => batch.status === 'draft');
  }, [batches]);

  const getClosedBatches = useCallback(() => {
    return batches.filter(batch => batch.status === 'closed');
  }, [batches]);

  // Auto-update effect
  useEffect(() => {
    if (autoUpdate) {
      // Initial check
      (async () => {
        const updates = await checkForAutoUpdates();
        if (autoApply && updates && updates.length > 0) {
          await applyAutoUpdates();
        }
      })();
      
      // Set up interval for periodic checks
      autoUpdateIntervalRef.current = setInterval(async () => {
        const updates = await checkForAutoUpdates();
        if (autoApply && updates && updates.length > 0) {
          await applyAutoUpdates();
        }
      }, autoUpdateInterval);
      
      return () => {
        if (autoUpdateIntervalRef.current) {
          clearInterval(autoUpdateIntervalRef.current);
        }
      };
    }
  }, [autoUpdate, autoUpdateInterval, autoApply, checkForAutoUpdates, applyAutoUpdates]);

  // Initial data load
  useEffect(() => {
    loadBatches();
  }, []); // Empty dependency array = only run once on mount

  // Update refs when state changes
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    currentPaginationRef.current = pagination;
  }, [pagination]);
  
  useEffect(() => {
    currentIncludeStatsRef.current = includeStats;
  }, [includeStats]);

  // Load batches when filters or pagination change
  useEffect(() => {
    loadBatches();
  }, [filters, pagination.page, pagination.pageSize, includeStats]);

  return {
    // State
    batches,
    loading,
    error,
    pagination,
    filters,
    
    // Auto-update state
    lastUpdateCheck,
    pendingUpdates,
    
    // CRUD operations
    loadBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    
    // Status management
    updateBatchStatus,
    pauseBatch,
    resumeBatch,
    forceActivate,
    forceClose,
    
    // Auto-update functions
    checkForAutoUpdates,
    applyAutoUpdates,
    
    // Filter and pagination
    updateFilters,
    updatePagination,
    
    // Utility functions
    getBatchById,
    getActiveBatches,
    getDraftBatches,
    getClosedBatches
  };
};

/**
 * Hook for dashboard statistics
 */
export const useSurveyBatchesStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await surveyBatchesService.getDashboardStatistics();

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats
  };
};

/**
 * Hook for business rules validation
 */
export const useBusinessRules = () => {
  const [checking, setChecking] = useState(false);

  const checkRules = useCallback(async (params) => {
    setChecking(true);
    
    try {
      const result = await surveyBatchesService.checkBusinessRules(params);
      return result;
    } catch (err) {
      return { success: false, error: 'Failed to check business rules' };
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkRules,
    checking
  };
};



