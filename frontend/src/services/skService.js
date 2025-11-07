import api from './api.js';

/**
 * SK Officials Management Service
 * Handles all API calls for SK Officials operations
 */
class SKService {
  /**
   * Get all SK officials with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.q - Search query
   * @param {string} params.status - Status filter (active/inactive)
   * @param {string} params.barangay - Barangay filter
   * @param {string} params.position - Position filter
   * @param {string} params.termId - Term filter
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise<Object>} API response with SK officials and pagination
   */
  async getSKOfficials(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.q) queryParams.append('q', params.q);
      if (params.status) queryParams.append('status', params.status);
      if (params.barangay) queryParams.append('barangay', params.barangay);
      if (params.position) queryParams.append('position', params.position);
      if (params.termId) queryParams.append('termId', params.termId);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await api.get(`/sk-officials?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK officials');
    }
  }

  /**
   * Get specific SK official by ID
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response with SK official data
   */
  async getSKOfficialById(id) {
    try {
      const response = await api.get(`/sk-officials/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK official');
    }
  }

  /**
   * Create new SK official
   * @param {Object} skData - SK official data
   * @param {string} skData.firstName - First name
   * @param {string} skData.lastName - Last name
   * @param {string} skData.middleName - Middle name (optional)
   * @param {string} skData.suffix - Suffix (optional)
   * @param {string} skData.personalEmail - Personal email
   * @param {string} skData.position - SK position
   * @param {string} skData.barangayId - Barangay ID
   * @param {string} skData.contactNumber - Contact number (optional)
   * @param {Object} skData.additionalInfo - Additional information (optional)
   * @returns {Promise<Object>} API response with created SK official
   */
  async createSKOfficial(skData) {
    try {
      const response = await api.post('/sk-officials', skData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create SK official');
    }
  }

  /**
   * Update SK official
   * @param {string} id - SK official ID
   * @param {Object} updateData - Updated SK official data
   * @returns {Promise<Object>} API response with updated SK official
   */
  async updateSKOfficial(id, updateData) {
    try {
      const response = await api.put(`/sk-officials/${id}`, updateData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update SK official');
    }
  }

  /**
   * Update SK official profile
   * @param {string} id - SK official ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} API response
   */
  async updateSKProfile(id, profileData) {
    try {
      const response = await api.put(`/sk-officials/${id}/profile`, profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update SK profile');
    }
  }

  /**
   * Update SK official contact information
   * @param {string} id - SK official ID
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} API response
   */
  async updateSKContact(id, contactData) {
    try {
      const response = await api.put(`/sk-officials/${id}/contact`, contactData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update SK contact');
    }
  }

  /**
   * Update SK official status
   * @param {string} id - SK official ID
   * @param {string} status - New status (active/inactive)
   * @param {string} reason - Reason for status change (optional)
   * @returns {Promise<Object>} API response
   */
  async updateSKStatus(id, status, reason = '') {
    try {
      const response = await api.put(`/sk-officials/${id}/status`, { status, reason });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update SK status');
    }
  }

  /**
   * Activate SK official
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response
   */
  async activateSKOfficial(id) {
    try {
      const response = await api.put(`/sk-officials/${id}/status`, { status: 'active' });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to activate SK official');
    }
  }

  /**
   * Deactivate SK official
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response
   */
  async deactivateSKOfficial(id) {
    try {
      const response = await api.put(`/sk-officials/${id}/status`, { status: 'inactive' });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to deactivate SK official');
    }
  }

  /**
   * Delete SK official
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response
   */
  async deleteSKOfficial(id) {
    try {
      const response = await api.delete(`/sk-officials/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to delete SK official');
    }
  }

  /**
   * Bulk update status for multiple SK officials
   * @param {Array<string>} ids - Array of SK official IDs
   * @param {string} action - Action to perform (activate/deactivate)
   * @returns {Promise<Object>} API response
   */
  async bulkUpdateStatus(ids, action) {
    try {
      const response = await api.put('/sk-officials/bulk/status', { ids, action });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to perform bulk operation');
    }
  }

  /**
   * Bulk activate SK officials
   * @param {Array<string>} ids - Array of SK official IDs
   * @returns {Promise<Object>} API response
   */
  async bulkActivate(ids) {
    try {
      const response = await api.post('/sk-officials/bulk/activate', { ids });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to bulk activate');
    }
  }

  /**
   * Bulk deactivate SK officials
   * @param {Array<string>} ids - Array of SK official IDs
   * @returns {Promise<Object>} API response
   */
  async bulkDeactivate(ids) {
    try {
      const response = await api.post('/sk-officials/bulk/deactivate', { ids });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to bulk deactivate');
    }
  }

  /**
   * Bulk delete SK officials
   * @param {Array<string>} ids - Array of SK official IDs
   * @returns {Promise<Object>} API response
   */
  async bulkDelete(ids) {
    try {
      const response = await api.post('/sk-officials/bulk/delete', { ids });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to bulk delete');
    }
  }

  /**
   * Validate bulk import file
   * @param {File} file - CSV/Excel file containing SK officials data
   * @returns {Promise<Object>} API response with validation results
   */
  async validateBulkImport(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/sk-officials/bulk/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Unwrap to return the validation payload directly for easier consumption
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to validate bulk import');
    }
  }

  /**
   * Import SK officials from file
   * @param {File} file - CSV/Excel file containing SK officials data
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} API response with import results
   */
  async bulkImportSKOfficials(file, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/sk-officials/bulk/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      // Unwrap to return the results payload directly
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to import SK officials');
    }
  }

  /**
   * Export SK officials data
   * @param {string} format - Export format (csv/pdf/excel)
   * @param {string} status - Status filter (all/active/inactive)
   * @param {Array<string>} selectedIds - Array of selected SK IDs (optional)
   * @param {string} style - PDF style (optional)
   * @returns {Promise<Object>} API response with exported data
   */
  async exportSKOfficials(format = 'csv', status = 'all', selectedIds = null, style = null, termId = null) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      if (style && format === 'pdf') {
        queryParams.append('style', style);
      }
      
      if (selectedIds && selectedIds.length > 0) {
        const idsString = selectedIds.join(',');
        queryParams.append('selectedIds', idsString);
      } else if (status !== 'all') {
        queryParams.append('status', status);
      }
      
      // Filter by active term when provided (applies when not exporting specific IDs)
      if ((!selectedIds || selectedIds.length === 0) && termId) {
        queryParams.append('termId', termId);
      }
      
      const response = await api.get(`/sk-officials/export/${format}?${queryParams.toString()}`, {
        responseType: format === 'csv' || format === 'pdf' ? 'blob' : 'json'
      });

      if (format === 'csv' || format === 'pdf') {
        // Handle file download
        const blob = new Blob([response.data], {
          type: format === 'csv' ? 'text/csv' : 'application/pdf'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sk-officials-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Export completed successfully' };
      }

      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to export SK officials');
    }
  }

  /**
   * Get SK statistics
   * @returns {Promise<Object>} API response with SK statistics
   */
  async getSKStatistics() {
    try {
      const response = await api.get('/sk-officials/statistics');
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK statistics');
    }
  }

  /**
   * Get vacancy statistics for a specific barangay
   * @param {string} barangayId - Barangay ID
   * @param {string} termId - Term ID
   * @param {boolean} detailed - Whether to include inactive officials in response
   * @returns {Promise<Object>} API response with barangay vacancies
   */
  async getBarangayVacancies(barangayId, termId, detailed = false) {
    try {
      const response = await api.get(`/sk-officials/vacancies/barangay/${barangayId}?termId=${termId}&detailed=${detailed}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch barangay vacancies');
    }
  }

  /**
   * Get vacancy statistics for all barangays
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} API response with all barangay vacancies
   */
  async getAllBarangayVacancies(termId) {
    try {
      const response = await api.get(`/sk-officials/vacancies/all?termId=${termId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch all barangay vacancies');
    }
  }

  /**
   * Get overall vacancy statistics for active term
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} API response with overall vacancy stats
   */
  async getOverallVacancyStats(termId) {
    try {
      const response = await api.get(`/sk-officials/vacancies/overall?termId=${termId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch overall vacancy statistics');
    }
  }

  /**
   * Validate position availability
   * @param {string} barangayId - Barangay ID
   * @param {string} position - Position to validate
   * @param {string} termId - Term ID
   * @param {string} excludeSkId - SK ID to exclude from validation (for updates)
   * @returns {Promise<Object>} API response with validation result
   */
  async validatePosition(barangayId, position, termId, excludeSkId = null) {
    try {
      const response = await api.post('/sk-officials/validate-position', {
        barangayId,
        position,
        termId,
        excludeSkId
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to validate position');
    }
  }

  /**
   * Get SK officials by term
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} API response with SK officials for the term
   */
  async getSKOfficialsByTerm(termId) {
    try {
      const response = await api.get(`/sk-officials/term/${termId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK officials for term');
    }
  }

  /**
   * Get current term SK officials
   * @returns {Promise<Object>} API response with current term SK officials
   */
  async getCurrentTermOfficials() {
    try {
      const response = await api.get('/sk-officials/term/current');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load current term officials');
    }
  }

  /**
   * Get SK Federation officers for a term
   * @param {string} termId
   */
  async getFederation(termId) {
    try {
      const response = await api.get(`/sk-federation/${termId}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK Federation officers');
    }
  }

  /**
   * Update SK Federation officers for a term
   * @param {string} termId
   * @param {Array<{position:string, official_id:string, display_order?:number, is_active?:boolean}>} assignments
   */
  async updateFederation(termId, assignments = []) {
    try {
      const response = await api.put(`/sk-federation/${termId}`, { assignments });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update SK Federation officers');
    }
  }

  /**
   * Export term detailed report (server-logged)
   * @param {string} termId
   * @param {'csv'|'excel'|'pdf'|'json'} format
   * @param {string|null} barangayId
   */
  async exportTermDetailed(termId, format = 'json', barangayId = null) {
    try {
      const query = new URLSearchParams();
      if (format) query.append('format', format);
      if (barangayId) query.append('barangayId', barangayId);
      const response = await api.get(`/sk-terms/${termId}/export-detailed?${query.toString()}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to export detailed report');
    }
  }

  /**
   * Get term officials grouped by barangay (for detailed report view)
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} { barangays: [{ barangayId, barangayName, officials: [...] }] }
   */
  async getTermOfficialsByBarangay(termId) {
    try {
      const response = await api.get(`/sk-terms/${termId}/officials-by-barangay`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load term officials by barangay');
    }
  }

  /**
   * Get SK officials by barangay
   * @param {string} barangayId - Barangay ID
   * @returns {Promise<Object>} API response with SK officials for the barangay
   */
  async getSKOfficialsByBarangay(barangayId) {
    try {
      const response = await api.get(`/sk-officials/barangay/${barangayId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK officials for barangay');
    }
  }

  /**
   * Get available positions for a barangay
   * @param {string} barangayId - Barangay ID
   * @returns {Promise<Object>} API response with available positions
   */
  async getBarangayPositions(barangayId) {
    try {
      const response = await api.get(`/sk-officials/barangay/${barangayId}/positions`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load barangay positions');
    }
  }

  /**
   * Get available positions
   * @returns {Promise<Object>} API response with available positions
   */
  async getAvailablePositions() {
    try {
      const response = await api.get('/sk-officials/positions/available');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load available positions');
    }
  }

  /**
   * Get position conflicts
   * @returns {Promise<Object>} API response with position conflicts
   */
  async getPositionConflicts() {
    try {
      const response = await api.get('/sk-officials/positions/conflicts');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load position conflicts');
    }
  }

  /**
   * Get SK official history
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response with SK official history
   */
  async getSKOfficialHistory(id) {
    try {
      const response = await api.get(`/sk-officials/${id}/history`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK official history');
    }
  }

  /**
   * Get SK official activities
   * @param {string} id - SK official ID
   * @returns {Promise<Object>} API response with SK official activities
   */
  async getSKOfficialActivities(id) {
    try {
      const response = await api.get(`/sk-officials/${id}/activities`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load SK official activities');
    }
  }

  /**
   * Validate SK official data
   * @param {Object} skData - SK official data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validation result
   */
  validateSKData(skData, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!skData.firstName?.trim()) {
        errors.push('First name is required');
      }
      if (!skData.lastName?.trim()) {
        errors.push('Last name is required');
      }
      if (!skData.personalEmail?.trim()) {
        errors.push('Personal email is required');
      }
      if (!skData.position?.trim()) {
        errors.push('Position is required');
      }
      if (!skData.barangayName?.trim()) {
        errors.push('Barangay name is required');
      }
    }

    // Email validation
    if (skData.personalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(skData.personalEmail)) {
        errors.push('Personal email format is invalid');
      }
    }

    // Removed contact number validation as it's no longer part of the template

    // Position validation
    const validPositions = ['SK Chairperson', 'SK Secretary', 'SK Treasurer', 'SK Councilor'];
    if (skData.position && !validPositions.includes(skData.position)) {
      errors.push('Invalid position selected');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate bulk operation
   * @param {Array<string>} ids - Array of SK official IDs
   * @param {string} action - Action to perform
   * @returns {Object} Validation result
   */
  validateBulkOperation(ids, action) {
    const errors = [];

    if (!Array.isArray(ids) || ids.length === 0) {
      errors.push('No SK officials selected');
    }

    if (!action) {
      errors.push('No action selected');
    }

    const validActions = ['activate', 'deactivate', 'delete'];
    if (action && !validActions.includes(action)) {
      errors.push('Invalid action selected');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate bulk import file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateBulkImportFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // File type validation
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      errors.push('Invalid file type. Only CSV and Excel files are allowed');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Download template file
   * @param {string} format - Template format (csv/xlsx)
   */
  async downloadTemplate(format = 'csv') {
    try {
      // Use backend endpoint for template generation (like Staff Management)
      const response = await api.get(`/sk-officials/bulk/template?format=${format}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sk-officials-template.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Template downloaded successfully' };
    } catch (error) {
      console.error('Template download error:', error);
      
      // Fallback to frontend generation if backend fails
      return this.downloadTemplateFallback(format);
    }
  }

  /**
   * Fallback template generation (frontend)
   * Used when backend template endpoint is unavailable
   * @param {string} format - Template format (csv/xlsx)
   */
  downloadTemplateFallback(format = 'csv') {
    const csvContent = `firstName,lastName,middleName,suffix,personalEmail,position,barangayName
Maria,Santos,Cruz,,maria.santos@gmail.com,SK Chairperson,Aguila
Juan,Dela Cruz,Reyes,Jr.,juan.delacruz@yahoo.com,SK Secretary,Anus`;

    if (format === 'csv') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sk-officials-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      // Create a proper Excel file using manual XML structure
      this.downloadExcelTemplate();
    }

    return { success: true, message: 'Template downloaded successfully (fallback)' };
  }

  /**
   * Download Excel template file
   * Creates a proper Excel file with SK Officials template data
   */
  downloadExcelTemplate() {
    // Excel XML structure for a simple workbook
    const excelData = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="SK Officials Template">
<Table>
<Row>
<Cell><Data ss:Type="String">firstName</Data></Cell>
<Cell><Data ss:Type="String">lastName</Data></Cell>
<Cell><Data ss:Type="String">middleName</Data></Cell>
<Cell><Data ss:Type="String">suffix</Data></Cell>
<Cell><Data ss:Type="String">personalEmail</Data></Cell>
<Cell><Data ss:Type="String">position</Data></Cell>
<Cell><Data ss:Type="String">barangayName</Data></Cell>
</Row>
<Row>
<Cell><Data ss:Type="String">Maria</Data></Cell>
<Cell><Data ss:Type="String">Santos</Data></Cell>
<Cell><Data ss:Type="String">Cruz</Data></Cell>
<Cell><Data ss:Type="String"></Data></Cell>
<Cell><Data ss:Type="String">maria.santos@gmail.com</Data></Cell>
<Cell><Data ss:Type="String">SK Chairperson</Data></Cell>
<Cell><Data ss:Type="String">Aguila</Data></Cell>
</Row>
<Row>
<Cell><Data ss:Type="String">Juan</Data></Cell>
<Cell><Data ss:Type="String">Dela Cruz</Data></Cell>
<Cell><Data ss:Type="String">Reyes</Data></Cell>
<Cell><Data ss:Type="String">Jr.</Data></Cell>
<Cell><Data ss:Type="String">juan.delacruz@yahoo.com</Data></Cell>
<Cell><Data ss:Type="String">SK Secretary</Data></Cell>
<Cell><Data ss:Type="String">Anus</Data></Cell>
</Row>
</Table>
</Worksheet>
</Workbook>`;

    const blob = new Blob([excelData], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sk-officials-template.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get barangay by ID
   * @param {string} barangayId - Barangay ID
   * @returns {Object|null} Barangay object or null if not found
   */
  getBarangayById(barangayId) {
    const barangayOptions = [
      { id: 'SJB001', name: 'Aguila' },
      { id: 'SJB002', name: 'Anus' },
      { id: 'SJB003', name: 'Aya' },
      { id: 'SJB004', name: 'Bagong Pook' },
      { id: 'SJB005', name: 'Balagtasin' },
      { id: 'SJB006', name: 'Balagtasin I' },
      { id: 'SJB007', name: 'Banaybanay I' },
      { id: 'SJB008', name: 'Banaybanay II' },
      { id: 'SJB009', name: 'Bigain I' },
      { id: 'SJB010', name: 'Bigain II' },
      { id: 'SJB011', name: 'Bigain South' },
      { id: 'SJB012', name: 'Calansayan' },
      { id: 'SJB013', name: 'Dagatan' },
      { id: 'SJB014', name: 'Don Luis' },
      { id: 'SJB015', name: 'Galamay-Amo' },
      { id: 'SJB016', name: 'Lalayat' },
      { id: 'SJB017', name: 'Lapolapo I' },
      { id: 'SJB018', name: 'Lapolapo II' },
      { id: 'SJB019', name: 'Lepute' },
      { id: 'SJB020', name: 'Lumil' },
      { id: 'SJB021', name: 'Mojon-Tampoy' },
      { id: 'SJB022', name: 'Natunuan' },
      { id: 'SJB023', name: 'Palanca' },
      { id: 'SJB024', name: 'Pinagtung-ulan' },
      { id: 'SJB025', name: 'Poblacion Barangay I' },
      { id: 'SJB026', name: 'Poblacion Barangay II' },
      { id: 'SJB027', name: 'Poblacion Barangay III' },
      { id: 'SJB028', name: 'Poblacion Barangay IV' },
      { id: 'SJB029', name: 'Sabang' },
      { id: 'SJB030', name: 'Salaban' },
      { id: 'SJB031', name: 'Santo Cristo' },
      { id: 'SJB032', name: 'Taysan' },
      { id: 'SJB033', name: 'Tugtug' }
    ];

    return barangayOptions.find(barangay => barangay.id === barangayId) || null;
  }

  /**
   * Get all barangays
   * @returns {Array} Array of barangay objects
   */
  getAllBarangays() {
    return [
      { id: 'SJB001', name: 'Aguila' },
      { id: 'SJB002', name: 'Anus' },
      { id: 'SJB003', name: 'Aya' },
      { id: 'SJB004', name: 'Bagong Pook' },
      { id: 'SJB005', name: 'Balagtasin' },
      { id: 'SJB006', name: 'Balagtasin I' },
      { id: 'SJB007', name: 'Banaybanay I' },
      { id: 'SJB008', name: 'Banaybanay II' },
      { id: 'SJB009', name: 'Bigain I' },
      { id: 'SJB010', name: 'Bigain II' },
      { id: 'SJB011', name: 'Bigain South' },
      { id: 'SJB012', name: 'Calansayan' },
      { id: 'SJB013', name: 'Dagatan' },
      { id: 'SJB014', name: 'Don Luis' },
      { id: 'SJB015', name: 'Galamay-Amo' },
      { id: 'SJB016', name: 'Lalayat' },
      { id: 'SJB017', name: 'Lapolapo I' },
      { id: 'SJB018', name: 'Lapolapo II' },
      { id: 'SJB019', name: 'Lepute' },
      { id: 'SJB020', name: 'Lumil' },
      { id: 'SJB021', name: 'Mojon-Tampoy' },
      { id: 'SJB022', name: 'Natunuan' },
      { id: 'SJB023', name: 'Palanca' },
      { id: 'SJB024', name: 'Pinagtung-ulan' },
      { id: 'SJB025', name: 'Poblacion Barangay I' },
      { id: 'SJB026', name: 'Poblacion Barangay II' },
      { id: 'SJB027', name: 'Poblacion Barangay III' },
      { id: 'SJB028', name: 'Poblacion Barangay IV' },
      { id: 'SJB029', name: 'Sabang' },
      { id: 'SJB030', name: 'Salaban' },
      { id: 'SJB031', name: 'Santo Cristo' },
      { id: 'SJB032', name: 'Taysan' },
      { id: 'SJB033', name: 'Tugtug' }
    ];
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  handleError(error, defaultMessage) {
    console.error('SK service error:', error);
    
    let message = defaultMessage;
    let details = null;

    if (error.response) {
      const { data, status } = error.response;
      
      if (data && data.message) {
        message = data.message;
      }
      
      if (data && data.errors) {
        details = data.errors;
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
          message = 'SK official not found.';
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
      message = 'Network error. Please check your connection.';
    } else {
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

// Create singleton instance
const skService = new SKService();
export default skService;

