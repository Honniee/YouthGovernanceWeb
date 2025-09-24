import { useState, useEffect, useCallback } from 'react';
import barangaysService from '../services/barangaysService';

/**
 * Custom hook for managing barangay data
 */
export const useBarangays = (params = {}) => {
  const [barangays, setBarangays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const loadBarangays = useCallback(async (loadParams = params) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await barangaysService.getBarangays(loadParams);
      
      if (result.success) {
        setBarangays(result.data);
        setMeta(result.meta);
      } else {
        setError(result.message || 'Failed to load barangays');
        setBarangays([]);
      }
    } catch (err) {
      console.error('Error loading barangays:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load barangays');
      setBarangays([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBarangays = useCallback(() => {
    loadBarangays(params);
  }, [loadBarangays, params]);

  useEffect(() => {
    loadBarangays();
  }, []);

  return {
    barangays,
    isLoading,
    error,
    meta,
    refreshBarangays,
    loadBarangays
  };
};

/**
 * Custom hook for managing barangay statistics
 */
export const useBarangayStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await barangaysService.getBarangayStatistics();
      
      if (result.success) {
        setStatistics(result.data);
      } else {
        setError(result.message || 'Failed to load barangay statistics');
        setStatistics(null);
      }
    } catch (err) {
      console.error('Error loading barangay statistics:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load barangay statistics');
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStatistics = useCallback(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refreshStatistics
  };
};

/**
 * Custom hook for managing individual barangay details
 */
export const useBarangay = (id) => {
  const [barangay, setBarangay] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBarangay = useCallback(async (barangayId = id) => {
    if (!barangayId) {
      setBarangay(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await barangaysService.getBarangayById(barangayId);
      
      if (result.success) {
        setBarangay(result.data);
      } else {
        setError(result.message || 'Failed to load barangay details');
        setBarangay(null);
      }
    } catch (err) {
      console.error('Error loading barangay details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load barangay details');
      setBarangay(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const refreshBarangay = useCallback(() => {
    loadBarangay(id);
  }, [loadBarangay, id]);

  useEffect(() => {
    loadBarangay();
  }, [loadBarangay]);

  return {
    barangay,
    isLoading,
    error,
    refreshBarangay
  };
};

/**
 * Custom hook for managing barangay youth list
 */
export const useBarangayYouth = (id, params = {}) => {
  const [youth, setYouth] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [barangayInfo, setBarangayInfo] = useState(null);

  const loadYouth = useCallback(async (barangayId = id, loadParams = params) => {
    if (!barangayId) {
      setYouth([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await barangaysService.getBarangayYouth(barangayId, loadParams);
      
      if (result.success) {
        setYouth(result.data.youth);
        setPagination(result.data.pagination);
        setBarangayInfo({
          barangay_id: result.data.barangay_id,
          barangay_name: result.data.barangay_name
        });
      } else {
        setError(result.message || 'Failed to load barangay youth');
        setYouth([]);
        setPagination(null);
        setBarangayInfo(null);
      }
    } catch (err) {
      console.error('Error loading barangay youth:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load barangay youth');
      setYouth([]);
      setPagination(null);
      setBarangayInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, params]);

  const refreshYouth = useCallback(() => {
    loadYouth(id, params);
  }, [loadYouth, id, params]);

  useEffect(() => {
    loadYouth();
  }, [loadYouth]);

  return {
    youth,
    isLoading,
    error,
    pagination,
    barangayInfo,
    refreshYouth,
    loadYouth
  };
};
