import api from './api';
import logger from '../utils/logger.js';

/**
 * Youth Profiles Service
 * Handles youth profile management for survey participants
 */

/**
 * Check if a youth profile exists
 */
export const checkYouthProfile = async (profileData) => {
  try {
    const response = await api.post('/youth-profiles/check', profileData);
    return response.data;
  } catch (error) {
      logger.error('Error checking youth profile', error, { profileDataKeys: Object.keys(profileData || {}) });
    throw error;
  }
};

/**
 * Create a new youth profile
 */
export const createYouthProfile = async (profileData) => {
  try {
    const response = await api.post('/youth-profiles', profileData);
    return response.data;
  } catch (error) {
      logger.error('Error creating youth profile', error, { profileDataKeys: Object.keys(profileData || {}) });
    throw error;
  }
};

/**
 * Get youth profile by ID
 */
export const getYouthProfile = async (youthId) => {
  try {
    const response = await api.get(`/youth-profiles/${youthId}`);
    return response.data;
  } catch (error) {
      logger.error('Error getting youth profile', error, { youthId });
    throw error;
  }
};

/**
 * Update youth profile
 */
export const updateYouthProfile = async (youthId, profileData) => {
  try {
    const response = await api.put(`/youth-profiles/${youthId}`, profileData);
    return response.data;
  } catch (error) {
      logger.error('Error updating youth profile', error, { youthId });
    throw error;
  }
};
