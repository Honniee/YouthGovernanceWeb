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
    const response = await apiHelpers.get(url);
    
    // Transform the response to match frontend expectations
    return {
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      }
    };
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
    // Check if we have an image file to upload
    if (announcementData.imageFile) {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(announcementData).forEach(key => {
        if (key !== 'imageFile' && announcementData[key] !== null && announcementData[key] !== undefined) {
          formData.append(key, announcementData[key]);
        }
      });
      
      // Add the image file
      formData.append('image', announcementData.imageFile);
      
      // Use FormData for the request
      return await apiHelpers.post('/announcements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      // Regular JSON request for text-only announcements
      return await apiHelpers.post('/announcements', announcementData);
    }
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

// Update announcement (admin only)
export const updateAnnouncement = async (id, announcementData) => {
  try {
    // Check if we have an image file to upload
    if (announcementData.imageFile) {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(announcementData).forEach(key => {
        if (key !== 'imageFile' && announcementData[key] !== null && announcementData[key] !== undefined) {
          formData.append(key, announcementData[key]);
        }
      });
      
      // Add the image file
      formData.append('image', announcementData.imageFile);
      
      // Use FormData for the request
      return await apiHelpers.put(`/announcements/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      // Regular JSON request for text-only announcements
      return await apiHelpers.put(`/announcements/${id}`, announcementData);
    }
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

// Upload announcement image
export const uploadAnnouncementImage = async (id, imageFile) => {
  try {
    console.log('🖼️ Uploading image for announcement:', id);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return await apiHelpers.put(`/announcements/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    console.error('Error uploading announcement image:', error);
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

// Update single announcement status
export const updateAnnouncementStatus = async (id, status) => {
  try {
    return await apiHelpers.patch(`/announcements/${id}/status`, {
      status: status
    });
  } catch (error) {
    console.error('Error updating announcement status:', error);
    throw error;
  }
};

// Bulk update announcement status
export const bulkUpdateAnnouncementStatus = async (announcementIds, status) => {
  try {
    return await apiHelpers.patch('/announcements/bulk/status', {
      announcement_ids: announcementIds,
      status: status
    });
  } catch (error) {
    console.error('Error bulk updating announcement status:', error);
    throw error;
  }
};

// Get announcement statistics
export const getAnnouncementStatistics = async () => {
  try {
    return await apiHelpers.get('/announcements/admin/statistics');
  } catch (error) {
    console.error('Error fetching announcement statistics:', error);
    throw error;
  }
};
