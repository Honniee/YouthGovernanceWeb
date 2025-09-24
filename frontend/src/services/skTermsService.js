import api from './api.js';

/**
 * SK Terms Management Service
 * Handles all API calls for SK Terms operations
 */
class SKTermsService {
  /**
   * Get all SK terms with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.q - Search query
   * @param {string} params.status - Status filter (active/inactive/completed)
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} API response with SK terms and pagination
   */
  async getSKTerms(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.q) queryParams.append('q', params.q);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/sk-terms?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK terms');
    }
  }

  /**
   * Get active SK term
   * @returns {Promise<Object>} API response with active term
   */
  async getActiveTerm() {
    try {
      const response = await api.get('/sk-terms/active');
      return { success: true, data: response.data.data };
    } catch (error) {
      // If no active term found (404), return null data instead of error
      if (error.response && error.response.status === 404) {
        return { success: true, data: null };
      }
      return this.handleError(error, 'Failed to load active term');
    }
  }

  /**
   * Get term history entries
   * @param {string} termId - optional Term ID; when provided fetches history for that term
   * @returns {Promise<Object>} API response with history entries
   */
  async getTermHistory(termId = null) {
    try {
      const url = termId ? `/sk-terms/${termId}/history` : '/sk-terms/history';
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load term history');
    }
  }

  /**
   * Get term history
   * @returns {Promise<Object>} API response with term history
   */
  async getTermHistory() {
    try {
      const response = await api.get('/sk-terms/history');
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load term history');
    }
  }

  /**
   * Get term statistics
   * @returns {Promise<Object>} API response with term statistics
   */
  async getTermStatistics() {
    try {
      const response = await api.get('/sk-terms/statistics');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load term statistics');
    }
  }

  /**
   * Get specific SK term by ID
   * @param {string} id - Term ID
   * @returns {Promise<Object>} API response with term data
   */
  async getSKTermById(id) {
    try {
      const response = await api.get(`/sk-terms/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK term');
    }
  }

  /**
   * Create new SK term
   * @param {Object} termData - Term data
   * @param {string} termData.termName - Term name
   * @param {string} termData.startDate - Term start date (YYYY-MM-DD)
   * @param {string} termData.endDate - Term end date (YYYY-MM-DD)
   * @returns {Promise<Object>} API response with created term
   */
  async createSKTerm(termData) {
    try {
      console.log('🔧 SKTerms Service: Creating term with data:', termData);
      const response = await api.post('/sk-terms', termData);
      console.log('🔧 SKTerms Service: API response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('🔧 SKTerms Service: Error creating term:', error);
      return this.handleError(error, 'Failed to create SK term');
    }
  }

  /**
   * Update SK term
   * @param {string} id - Term ID
   * @param {Object} updateData - Updated term data
   * @returns {Promise<Object>} API response with updated term
   */
  async updateSKTerm(id, updateData) {
    try {
      console.log('🔧 SKTerms Service: Updating term with data:', { id, updateData });
      const response = await api.put(`/sk-terms/${id}`, updateData);
      console.log('🔧 SKTerms Service: Update successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.log('🔧 SKTerms Service: Update failed, calling handleError');
      return this.handleError(error, 'Failed to update SK term');
    }
  }

  /**
   * Activate SK term
   * @param {string} id - Term ID
   * @returns {Promise<Object>} API response
   */
  async activateSKTerm(id) {
    try {
      const response = await api.patch(`/sk-terms/${id}/activate`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to activate SK term');
    }
  }

  /**
   * Complete SK term
   * @param {string} id - Term ID
   * @param {boolean} force - Whether to force completion (updates end date to today)
   * @returns {Promise<Object>} API response
   */
  async completeSKTerm(id, force = false) {
    try {
      const response = await api.patch(`/sk-terms/${id}/complete`, { force });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to complete SK term');
    }
  }

  /**
   * Extend SK term
   * @param {string} id - Term ID
   * @param {string} newEndDate - New end date (YYYY-MM-DD)
   * @param {string} reason - Reason for extension (optional)
   * @returns {Promise<Object>} API response
   */
  async extendSKTerm(id, newEndDate, reason = '') {
    try {
      const response = await api.patch(`/sk-terms/${id}/extend`, { 
        newEndDate, 
        reason 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to extend SK term');
    }
  }

  /**
   * Trigger manual status update (for testing)
   * @returns {Promise<Object>} API response
   */
  async triggerManualStatusUpdate() {
    try {
      const response = await api.get('/cron/manual-update-term-statuses');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to trigger manual status update');
    }
  }

  /**
   * Get pending status updates
   * @returns {Promise<Object>} API response
   */
  async getPendingStatusUpdates() {
    try {
      const response = await api.get('/cron/pending-status-updates');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get pending status updates');
    }
  }

  /**
   * Delete SK term
   * @param {string} id - Term ID
   * @returns {Promise<Object>} API response
   */
  async deleteSKTerm(id) {
    try {
      const response = await api.delete(`/sk-terms/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to delete SK term');
    }
  }

  /**
   * Get officials by term
   * @param {string} id - Term ID
   * @returns {Promise<Object>} API response with officials for the term
   */
  async getOfficialsByTerm(id) {
    try {
      const response = await api.get(`/sk-terms/${id}/officials`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load officials for term');
    }
  }





  /**
   * Get suggested term dates
   * @returns {Promise<Object>} API response
   */
  async getSuggestedDates() {
    try {
      const response = await api.get('/sk-terms/suggested-dates');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get suggested dates');
    }
  }

  /**
   * Get term officials statistics
   * @param {string} id - Term ID
   * @returns {Promise<Object>} API response with term officials statistics
   */
  async getTermOfficialsStatistics(id) {
    try {
      const response = await api.get(`/sk-terms/${id}/statistics`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load term officials statistics');
    }
  }

  /**
   * Validate term data
   * @param {Object} termData - Term data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateTermData(termData, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!termData.termName?.trim()) {
        errors.push('Term name is required');
      }
      if (!termData.startDate) {
        errors.push('Start date is required');
      }
      if (!termData.endDate) {
        errors.push('End date is required');
      }
    }

    // Date validation
    if (termData.startDate && termData.endDate) {
      const startDate = new Date(termData.startDate);
      const endDate = new Date(termData.endDate);
      
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format');
      }
      
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format');
      }
      
      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
      
      // Check if dates are reasonable (not too far in past/future)
      const now = new Date();
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
      
      if (startDate < fiveYearsAgo) {
        errors.push('Start date cannot be more than 5 years in the past');
      }
      
      if (endDate > tenYearsFromNow) {
        errors.push('End date cannot be more than 10 years in the future');
      }
    }

    // Term name validation
    if (termData.termName) {
      if (termData.termName.length < 3) {
        errors.push('Term name must be at least 3 characters long');
      }
      if (termData.termName.length > 100) {
        errors.push('Term name cannot exceed 100 characters');
      }
    }

    // Description validation
    if (termData.description && termData.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check for term overlaps
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} excludeTermId - Term ID to exclude from check (for updates)
   * @returns {Promise<Object>} Validation result
   */
  async checkTermOverlap(startDate, endDate, excludeTermId = null) {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (excludeTermId) {
        params.append('excludeTermId', excludeTermId);
      }

      const response = await api.get(`/sk-terms/check-overlap?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to check term overlap');
    }
  }

  /**
   * Get suggested term dates based on previous terms
   * @returns {Promise<Object>} API response with suggested dates
   */
  async getSuggestedTermDates() {
    try {
      const response = await api.get('/sk-terms/suggested-dates');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get suggested term dates');
    }
  }

  /**
   * Get term templates
   * @returns {Array} Term templates
   */
  getTermTemplates() {
    const currentYear = new Date().getFullYear();
    
    return [
      {
        id: 'standard-3-year',
        name: '3-Year Standard Term',
        description: 'Standard 3-year SK term',
        duration: 3,
        startDate: `${currentYear}-07-01`,
        endDate: `${currentYear + 3}-06-30`,
        termName: `${currentYear}-${currentYear + 3} Term`
      },
      {
        id: 'standard-2-year',
        name: '2-Year Term',
        description: 'Shortened 2-year SK term',
        duration: 2,
        startDate: `${currentYear}-07-01`,
        endDate: `${currentYear + 2}-06-30`,
        termName: `${currentYear}-${currentYear + 2} Term`
      },
      {
        id: 'mid-year-start',
        name: 'Mid-Year Start',
        description: 'Term starting in January',
        duration: 3,
        startDate: `${currentYear + 1}-01-01`,
        endDate: `${currentYear + 4}-12-31`,
        termName: `${currentYear + 1}-${currentYear + 4} Term`
      }
    ];
  }

  /**
   * Apply term template
   * @param {string} templateId - Template ID
   * @param {Object} customizations - Custom overrides
   * @returns {Object} Term data
   */
  applyTermTemplate(templateId, customizations = {}) {
    const templates = this.getTermTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    return {
      termName: customizations.termName || template.termName,
      startDate: customizations.startDate || template.startDate,
      endDate: customizations.endDate || template.endDate,
      description: customizations.description || template.description || '',
      ...customizations
    };
  }

  /**
   * Format term display name
   * @param {Object} term - Term data
   * @returns {string} Formatted display name
   */
  formatTermDisplay(term) {
    if (!term) return 'Unknown Term';
    
    const startYear = new Date(term.startDate).getFullYear();
    const endYear = new Date(term.endDate).getFullYear();
    
    return `${term.termName} (${startYear}-${endYear})`;
  }

  /**
   * Get term duration in years
   * @param {Object} term - Term data
   * @returns {number} Duration in years
   */
  getTermDuration(term) {
    if (!term || !term.startDate || !term.endDate) return 0;
    
    const startDate = new Date(term.startDate);
    const endDate = new Date(term.endDate);
    
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25));
  }

  /**
   * Check if term is current
   * @param {Object} term - Term data
   * @returns {boolean} Whether term is current
   */
  isCurrentTerm(term) {
    if (!term || !term.startDate || !term.endDate) return false;
    
    const now = new Date();
    const startDate = new Date(term.startDate);
    const endDate = new Date(term.endDate);
    
    return now >= startDate && now <= endDate;
  }

  /**
   * Get term status
   * @param {Object} term - Term data
   * @returns {string} Term status (upcoming/active/completed)
   */
  getTermStatus(term) {
    if (!term || !term.startDate || !term.endDate) return 'unknown';
    
    const now = new Date();
    const startDate = new Date(term.startDate);
    const endDate = new Date(term.endDate);
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  handleError(error, defaultMessage) {
    console.error('SK Terms service error:', error);
    console.log('🔍 Error response data:', error.response?.data);
    console.log('🔍 Error response status:', error.response?.status);
    
    let message = defaultMessage;
    let details = null;
    let suggestions = null;

    if (error.response) {
      const { data, status } = error.response;
      
      console.log('🔍 Raw error response data:', data);
      console.log('🔍 Error response status:', status);
      
      if (data && data.message) {
        message = data.message;
      }
      
      if (data && data.errors) {
        details = data.errors;
        console.log('🔍 Extracted errors:', details);
      }
      
      if (data && data.suggestions) {
        suggestions = data.suggestions;
        console.log('🔍 Extracted suggestions:', suggestions);
      }

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
          message = 'SK term not found.';
          break;
        case 409:
          message = message || 'Term dates conflict with existing terms.';
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
      message = 'Network error. Please check your connection.';
    } else {
      message = error.message || defaultMessage;
    }

    const result = {
      success: false,
      message,
      details,
      suggestions,
      status: error.response?.status || 0
    };
    
    console.log('🔧 SKTerms Service handleError result:', result);
    return result;
  }
}

// Create singleton instance
const skTermsService = new SKTermsService();
export default skTermsService;

