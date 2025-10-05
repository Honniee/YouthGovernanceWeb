import { useState, useCallback } from 'react';
import { checkYouthProfile, createYouthProfile, getYouthProfile, updateYouthProfile } from '../services/youthProfilesService';

/**
 * Custom hook for managing youth profiles
 * Handles checking, creating, and updating youth profiles for survey participants
 */
export const useYouthProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  /**
   * Check if a youth profile exists
   */
  const checkProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await checkYouthProfile(profileData);
      
      if (result.success && result.exists) {
        setProfile(result.profile);
        return {
          exists: true,
          youthId: result.youth_id,
          userId: result.user_id,
          profile: result.profile
        };
      } else {
        setProfile(null);
        return {
          exists: false,
          youthId: null,
          userId: null,
          profile: null
        };
      }
    } catch (err) {
      setError(err.message || 'Failed to check youth profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new youth profile
   */
  const createProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createYouthProfile(profileData);
      
      if (result.success) {
        setProfile(result.profile);
        return {
          youthId: result.youth_id,
          userId: result.user_id,
          profile: result.profile
        };
      } else {
        throw new Error(result.message || 'Failed to create youth profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to create youth profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get youth profile by ID
   */
  const getProfile = useCallback(async (youthId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getYouthProfile(youthId);
      
      if (result.success) {
        setProfile(result.profile);
        return {
          youthId: result.youth_id,
          userId: result.user_id,
          profile: result.profile
        };
      } else {
        throw new Error(result.message || 'Failed to get youth profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to get youth profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update youth profile
   */
  const updateProfile = useCallback(async (youthId, profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateYouthProfile(youthId, profileData);
      
      if (result.success) {
        setProfile(result.profile);
        return result.profile;
      } else {
        throw new Error(result.message || 'Failed to update youth profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update youth profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear profile data
   */
  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    profile,
    checkProfile,
    createProfile,
    getProfile,
    updateProfile,
    clearProfile,
    clearError
  };
};
