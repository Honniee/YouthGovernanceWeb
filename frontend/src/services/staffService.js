import api from './api.js';

/**
 * Staff Management Service
 * Handles all API calls for staff operations
 */
class StaffService {
  /**
   * Get all staff members with pagination and filtering
   */
  async getStaffList(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.q) queryParams.append('q', params.q);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/staff?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load staff list');
    }
  }

  /**
   * Get specific staff member by ID
   */
  async getStaffById(id) {
    try {
      const response = await api.get(`/staff/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load staff member');
    }
  }

  /**
   * Create new staff member
   */
  async createStaff(staffData) {
    try {
      const response = await api.post('/staff', staffData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create staff member');
    }
  }

  /**
   * Update existing staff member
   */
  async updateStaff(id, staffData) {
    try {
      const response = await api.put(`/staff/${id}`, staffData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update staff member');
    }
  }

  /**
   * Update staff status (activate/deactivate)
   */
  async updateStaffStatus(id, status, reason = '') {
    try {
      const response = await api.patch(`/staff/${id}/status`, { 
        status,
        reason: reason || undefined
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update staff status');
    }
  }

  /**
   * Soft delete staff member
   */
  async deleteStaff(id) {
    try {
      const response = await api.delete(`/staff/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to delete staff member');
    }
  }

  /**
   * NEW: Bulk operations (activate/deactivate/delete multiple staff)
   */
  async bulkUpdateStatus(ids, action) {
    try {
      const response = await api.post('/staff/bulk/status', {
        ids,
        action // 'activate' or 'deactivate'
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to perform bulk operation');
    }
  }

  /**
   * NEW: Export staff data
   */
  async exportStaff(format = 'csv', status = 'all', selectedIds = null, style = null) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      // Add style parameter for PDF exports
      if (style && format === 'pdf') {
        queryParams.append('style', style);
      }
      
      logger.debug('Frontend exportStaff called', { format, status, selectedIdsCount: selectedIds?.length, style });
      
      // If specific IDs are provided, add them to the query
      if (selectedIds && selectedIds.length > 0) {
        const idsString = selectedIds.join(',');
        queryParams.append('selectedIds', idsString);
        logger.debug('Adding selectedIds to query', { count: selectedIds.length });
      } else if (status !== 'all') {
        // Only apply status filter if not filtering by specific IDs
        queryParams.append('status', status);
        logger.debug('Adding status filter to query', { status });
      } else {
        logger.debug('No filters - exporting all staff');
      }
      
      logger.debug('Final query URL', { url: `/staff/export?${queryParams.toString()}` });

      const response = await api.get(`/staff/export?${queryParams.toString()}`, {
        responseType: format === 'csv' || format === 'pdf' ? 'blob' : 'json'
      });

      if (format === 'csv' || format === 'pdf') {
        // Handle file download (backend handles the download headers)
        const contentType = format === 'csv' ? 'text/csv' : 'application/pdf';
        const extension = format === 'csv' ? 'csv' : 'pdf';
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `staff_export_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Return success - backend has already created the audit log
        return { success: true, message: 'Export completed successfully', data: response.data };
      } else {
        // Handle JSON response
        return { success: true, data: response.data };
      }
    } catch (error) {
      return this.handleError(error, 'Failed to export staff data');
    }
  }

  /**
   * NEW: Get staff statistics
   */
  async getStaffStats() {
    try {
      // Get counts for different statuses
      const [activeResponse, deactivatedResponse, allResponse] = await Promise.all([
        this.getStaffList({ status: 'active', limit: 1 }),
        this.getStaffList({ status: 'deactivated', limit: 1 }),
        this.getStaffList({ limit: 1 })
      ]);

      const stats = {
        total: allResponse.success ? allResponse.data.total : 0,
        active: activeResponse.success ? activeResponse.data.total : 0,
        deactivated: deactivatedResponse.success ? deactivatedResponse.data.total : 0
      };

      return { success: true, data: stats };
    } catch (error) {
      return this.handleError(error, 'Failed to load staff statistics');
    }
  }

  /**
   * NEW: Search staff with advanced filters
   */
  async searchStaff(searchParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add search parameters
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== null && searchParams[key] !== '') {
          queryParams.append(key, searchParams[key]);
        }
      });

      const response = await api.get(`/staff?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to search staff');
    }
  }

  /**
   * NEW: Validate staff data before submission
   */
  validateStaffData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.firstName || data.firstName.trim() === '') {
        errors.push('First name is required');
      }
      if (!data.lastName || data.lastName.trim() === '') {
        errors.push('Last name is required');
      }
      if (!data.personalEmail || data.personalEmail.trim() === '') {
        errors.push('Personal email is required');
      }
    }

    // Field length validation
    if (data.firstName && data.firstName.trim().length > 50) {
      errors.push('First name must be 50 characters or less');
    }
    if (data.lastName && data.lastName.trim().length > 50) {
      errors.push('Last name must be 50 characters or less');
    }
    if (data.middleName && data.middleName.trim().length > 50) {
      errors.push('Middle name must be 50 characters or less');
    }
    if (data.suffix && data.suffix.trim().length > 50) {
      errors.push('Suffix must be 50 characters or less');
    }

    // Email validation
    if (data.personalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.personalEmail)) {
        errors.push('Personal email must be a valid email address');
      }
    }

    // Phone validation (if provided)
    if (data.phone) {
      const phoneRegex = /^(\+63|63|0)?9\d{9}$/;
      if (!phoneRegex.test(data.phone.replace(/\s+/g, ''))) {
        errors.push('Phone number must be a valid Philippine phone number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * NEW: Validate bulk operation data
   */
  validateBulkOperation(ids, action) {
    const errors = [];

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      errors.push('Staff IDs are required');
    }

    if (ids && ids.length > 100) {
      errors.push('Cannot process more than 100 staff members at once');
    }

    // Validate each ID format (same as backend validation)
    if (ids) {
      for (let i = 0; i < ids.length; i++) {
        if (!/^LYDO\d{3}$/.test(ids[i])) {
          errors.push(`Invalid LYDO ID format at index ${i}: ${ids[i]} (type: ${typeof ids[i]})`);
        }
      }
    }

    if (!action || !['activate', 'deactivate'].includes(action)) {
      errors.push('Action must be either "activate" or "deactivate"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Bulk import staff from CSV/Excel file
   */
  async bulkImportStaff(file, duplicateStrategy = 'skip', onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicateStrategy', duplicateStrategy);

      const response = await api.post('/staff/bulk/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to import staff data');
    }
  }

  /**
   * Validate staff bulk import file on the backend
   */
  async validateBulkImport(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/staff/bulk/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to validate staff import file');
    }
  }

  /**
   * Download bulk import template
   */
  async downloadTemplate(format = 'csv') {
    try {
      const response = await api.get(`/staff/bulk/template?format=${format}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `staff_import_template.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Template downloaded successfully' };
    } catch (error) {
      return this.handleError(error, 'Failed to download template');
    }
  }

  /**
   * Validate bulk import file
   */
  validateBulkImportFile(file) {
    const errors = [];

    if (!file) {
      errors.push('Please select a file');
      return { isValid: false, errors };
    }

    // Check file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload a CSV or Excel file.');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      errors.push('Invalid file extension. Use .csv, .xlsx, or .xls files.');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Handle API errors consistently
   */
  handleError(error, defaultMessage) {
    logger.error('Staff service error', error);
    
    let message = defaultMessage;
    let details = null;

    if (error.response) {
      // Server responded with error status
      const { data, status } = error.response;
      
      if (data && data.message) {
        message = data.message;
      }
      
      if (data && data.errors) {
        details = data.errors;
      }

      // Handle specific HTTP status codes
      switch (status) {
        case 400:
          message = message || 'Invalid request data';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'Staff member not found.';
          break;
        case 409:
          message = message || 'Conflict with existing data.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = message || 'An unexpected error occurred.';
      }
    } else if (error.request) {
      // Network error
      message = 'Network error. Please check your connection.';
    } else {
      // Other error
      message = error.message || defaultMessage;
    }

    return {
      success: false,
      message,
      details,
      status: error.response?.status || 0
    };
  }
}

const staffService = new StaffService();
export default staffService; 