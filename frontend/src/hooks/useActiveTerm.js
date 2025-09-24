import { useState, useEffect } from 'react';
import skTermsService from '../services/skTermsService';

export const useActiveTerm = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActiveTerm = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await skTermsService.getActiveTerm();
      if (response.success) {
        setActiveTerm(response.data);
      } else {
        setActiveTerm(null);
        setError(response.message || 'Failed to load active term');
      }
    } catch (err) {
      setActiveTerm(null);
      setError(err.message || 'Error loading active term');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActiveTerm = () => {
    loadActiveTerm();
  };

  useEffect(() => {
    loadActiveTerm();
  }, []);

  return {
    activeTerm,
    isLoading,
    error,
    refreshActiveTerm,
    hasActiveTerm: !!activeTerm
  };
};
