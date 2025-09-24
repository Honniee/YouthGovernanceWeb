import { useState, useEffect, useCallback } from 'react';
import { useActiveTerm } from './useActiveTerm.js';
import skService from '../services/skService.js';

// Position limits per barangay (matching backend)
const POSITION_LIMITS = {
  'SK Chairperson': 1,
  'SK Secretary': 1, 
  'SK Treasurer': 1,
  'SK Councilor': 7
};

export const useSKValidation = () => {
  const [barangayVacancies, setBarangayVacancies] = useState({});
  const [overallVacancyStats, setOverallVacancyStats] = useState({});
  const [isLoadingVacancies, setIsLoadingVacancies] = useState(false);
  const [validationError, setValidationError] = useState(null);
  
  const { activeTerm, hasActiveTerm } = useActiveTerm();

  // Load vacancy statistics for a specific barangay
  const loadBarangayVacancies = useCallback(async (barangayId, detailed = false) => {
    if (!hasActiveTerm || !activeTerm?.termId) {
      console.warn('No active term available for vacancy loading');
      return;
    }

    try {
      setIsLoadingVacancies(true);
      setValidationError(null);
      
      const response = await skService.getBarangayVacancies(barangayId, activeTerm.termId, detailed);
      
      if (response.success) {
        setBarangayVacancies(prev => ({
          ...prev,
          [barangayId]: response.data
        }));
      } else {
        console.error('Failed to load barangay vacancies:', response.message);
        setValidationError(response.message);
      }
    } catch (error) {
      console.error('Error loading barangay vacancies:', error);
      setValidationError('Failed to load vacancy data');
    } finally {
      setIsLoadingVacancies(false);
    }
  }, [hasActiveTerm, activeTerm?.termId]);

  // Load all barangay vacancies
  const loadAllBarangayVacancies = useCallback(async () => {
    if (!hasActiveTerm || !activeTerm?.termId) {
      console.warn('No active term available for all barangay vacancy loading');
      return;
    }

    try {
      setIsLoadingVacancies(true);
      setValidationError(null);
      
      const response = await skService.getAllBarangayVacancies(activeTerm.termId);
      
      if (response.success) {
        setBarangayVacancies(response.data);
      } else {
        console.error('Failed to load all barangay vacancies:', response.message);
        setValidationError(response.message);
      }
    } catch (error) {
      console.error('Error loading all barangay vacancies:', error);
      setValidationError('Failed to load all barangay vacancy data');
    } finally {
      setIsLoadingVacancies(false);
    }
  }, [hasActiveTerm, activeTerm?.termId]);

  // Load overall vacancy statistics
  const loadOverallVacancyStats = useCallback(async () => {
    if (!hasActiveTerm || !activeTerm?.termId) {
      console.warn('No active term available for overall vacancy loading');
      return;
    }

    try {
      setIsLoadingVacancies(true);
      setValidationError(null);
      
      const response = await skService.getOverallVacancyStats(activeTerm.termId);
      
      if (response.success) {
        setOverallVacancyStats(response.data);
      } else {
        console.error('Failed to load overall vacancy stats:', response.message);
        setValidationError(response.message);
      }
    } catch (error) {
      console.error('Error loading overall vacancy stats:', error);
      setValidationError('Failed to load overall vacancy data');
    } finally {
      setIsLoadingVacancies(false);
    }
  }, [hasActiveTerm, activeTerm?.termId]);

  // Get available positions for a barangay
  const getAvailablePositions = useCallback((barangayId) => {
    const vacancies = barangayVacancies[barangayId];
    if (!vacancies) return [];

    return Object.entries(vacancies)
      .filter(([position, data]) => data.available > 0)
      .map(([position, data]) => ({
        value: position,
        label: position,
        available: data.available,
        current: data.current,
        max: data.max
      }));
  }, [barangayVacancies]);

  // Get all positions with availability status for a barangay
  const getAllPositionsWithAvailability = useCallback((barangayId) => {
    const vacancies = barangayVacancies[barangayId];
    if (!vacancies) {
      // Return default positions if no vacancy data available
      return Object.entries(POSITION_LIMITS).map(([position, limit]) => ({
        value: position,
        label: position,
        available: limit,
        current: 0,
        max: limit,
        isAvailable: true
      }));
    }

    return Object.entries(POSITION_LIMITS).map(([position, limit]) => {
      const vacancyData = vacancies[position] || { current: 0, max: limit, available: limit };
      return {
        value: position,
        label: position,
        available: vacancyData.available,
        current: vacancyData.current,
        max: vacancyData.max,
        isAvailable: vacancyData.available > 0
      };
    });
  }, [barangayVacancies]);

  // Validate position availability
  const validatePosition = useCallback(async (barangayId, position, excludeSkId = null) => {
    if (!hasActiveTerm || !activeTerm?.termId) {
      return {
        isValid: false,
        error: 'No active term available'
      };
    }

    try {
      setValidationError(null);
      
      const response = await skService.validatePosition(
        barangayId, 
        position, 
        activeTerm.termId, 
        excludeSkId
      );
      
      if (response.success) {
        return {
          isValid: response.data.isValid,
          error: response.data.isValid ? null : `Position limit exceeded: ${response.data.currentCount}/${response.data.maxAllowed}`,
          data: response.data
        };
      } else {
        return {
          isValid: false,
          error: response.message
        };
      }
    } catch (error) {
      console.error('Error validating position:', error);
      return {
        isValid: false,
        error: 'Failed to validate position'
      };
    }
  }, [hasActiveTerm, activeTerm?.termId]);

  // Get vacancy summary for display
  const getVacancySummary = useCallback(() => {
    if (!overallVacancyStats || Object.keys(overallVacancyStats).length === 0) {
      return {
        totalPositions: 0,
        filledPositions: 0,
        vacantPositions: 0,
        vacancyRate: 0
      };
    }

    const totalPositions = Object.values(overallVacancyStats).reduce((sum, stat) => sum + stat.max, 0);
    const filledPositions = Object.values(overallVacancyStats).reduce((sum, stat) => sum + stat.filled, 0);
    const vacantPositions = totalPositions - filledPositions;
    const vacancyRate = totalPositions > 0 ? (vacantPositions / totalPositions * 100).toFixed(1) : 0;

    return {
      totalPositions,
      filledPositions,
      vacantPositions,
      vacancyRate
    };
  }, [overallVacancyStats]);

  // Load overall stats when active term changes
  useEffect(() => {
    if (hasActiveTerm && activeTerm?.termId) {
      loadOverallVacancyStats();
    }
  }, [hasActiveTerm, activeTerm?.termId, loadOverallVacancyStats]);

  return {
    // State
    barangayVacancies,
    overallVacancyStats,
    isLoadingVacancies,
    validationError,
    
    // Actions
    loadBarangayVacancies,
    loadAllBarangayVacancies,
    loadOverallVacancyStats,
    validatePosition,
    
    // Computed values
    getAvailablePositions,
    getAllPositionsWithAvailability,
    getVacancySummary,
    
    // Constants
    POSITION_LIMITS
  };
};
