import { useState, useEffect, useCallback } from 'react';
import surveyBatchesService from '../services/surveyBatchesService';

/**
 * Hook to get active survey batch information
 * Similar to useActiveTerm but for survey batches
 */
export const useActiveSurvey = () => {
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActiveSurvey = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get active surveys from API using the public endpoint
      const result = await surveyBatchesService.getSurveyBatches({
        status: 'active',
        limit: 1, // Get the first active survey
        sortBy: 'created_at',
        sortOrder: 'desc'
      }, '/active'); // Use the public /active endpoint

      if (result.success && result.data.data && result.data.data.length > 0) {
        setActiveSurvey(result.data.data[0]);
      } else {
        setActiveSurvey(null);
      }
    } catch (err) {
      console.error('Error loading active survey:', err);
      setError('Failed to load active survey');
      setActiveSurvey(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load active survey on mount
  useEffect(() => {
    loadActiveSurvey();
  }, [loadActiveSurvey]);

  // Refresh active survey data
  const refreshActiveSurvey = useCallback(() => {
    loadActiveSurvey();
  }, [loadActiveSurvey]);

  return {
    activeSurvey,
    hasActiveSurvey: !!activeSurvey,
    isLoading,
    error,
    refreshActiveSurvey
  };
};
