import { useState, useEffect, useCallback } from 'react';
import statisticsService from '../services/statisticsService.js';
import logger from '../utils/logger.js';

/**
 * Hook to get home page statistics
 * Fetches statistics data from the backend API
 */
export const useStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug('Loading statistics');
      const result = await statisticsService.getHomePageStatistics();
      
      if (result.success) {
        setStatistics(result.data);
        setLastUpdated(new Date());
        logger.debug('Statistics loaded successfully', { hasData: !!result.data });
      } else {
        setError(result.message || 'Failed to load statistics');
        logger.error('Failed to load statistics', null, { message: result.message });
      }
    } catch (err) {
      logger.error('Error loading statistics', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // Refresh function
  const refreshStatistics = useCallback(() => {
    return loadStatistics();
  }, [loadStatistics]);

  return {
    statistics,
    isLoading,
    error,
    lastUpdated,
    refreshStatistics
  };
};

/**
 * Hook to get admin dashboard statistics
 * Fetches comprehensive statistics for admin dashboard
 */
export const useAdminStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAdminStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug('Loading admin statistics');
      const result = await statisticsService.getAdminDashboardStatistics();
      
      if (result.success) {
        setStatistics(result.data);
        setLastUpdated(new Date());
        logger.debug('Admin statistics loaded successfully', { hasData: !!result.data });
      } else {
        setError(result.message || 'Failed to load admin statistics');
        logger.error('Failed to load admin statistics', null, { message: result.message });
      }
    } catch (err) {
      logger.error('Error loading admin statistics', err);
      setError('Failed to load admin statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load statistics on mount
  useEffect(() => {
    loadAdminStatistics();
  }, [loadAdminStatistics]);

  // Refresh function
  const refreshAdminStatistics = useCallback(() => {
    return loadAdminStatistics();
  }, [loadAdminStatistics]);

  return {
    statistics,
    isLoading,
    error,
    lastUpdated,
    refreshAdminStatistics
  };
};
