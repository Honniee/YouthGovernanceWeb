import { apiHelpers } from './api.js';

/**
 * Announcements Service
 * Handles all announcement-related API calls
 */

// Get all announcements with filtering and pagination
export const getAnnouncements = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add pagination params
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    // Add filtering params
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.is_featured !== undefined) queryParams.append('is_featured', params.is_featured);
    if (params.is_pinned !== undefined) queryParams.append('is_pinned', params.is_pinned);
    
    // Add sorting params
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const url = `/announcements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiHelpers.get(url);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

// Get featured announcements for homepage
export const getFeaturedAnnouncements = async (limit = 5) => {
  try {
    return await getAnnouncements({
      status: 'published',
      is_featured: true,
      limit: limit,
      sortBy: 'published_at',
      sortOrder: 'DESC'
    });
  } catch (error) {
    console.error('Error fetching featured announcements:', error);
    throw error;
  }
};

// Get announcement by ID
export const getAnnouncementById = async (id) => {
  try {
    return await apiHelpers.get(`/announcements/${id}`);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    throw error;
  }
};

// Get announcement categories
export const getAnnouncementCategories = async () => {
  try {
    return await apiHelpers.get('/announcements/categories');
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Create announcement (admin only)
export const createAnnouncement = async (announcementData) => {
  try {
    return await apiHelpers.post('/announcements', announcementData);
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

// Update announcement (admin only)
export const updateAnnouncement = async (id, announcementData) => {
  try {
    return await apiHelpers.put(`/announcements/${id}`, announcementData);
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

// Delete announcement (admin only)
export const deleteAnnouncement = async (id) => {
  try {
    return await apiHelpers.delete(`/announcements/${id}`);
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};
