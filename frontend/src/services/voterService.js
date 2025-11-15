import api from './api.js';
import * as XLSX from 'xlsx';

class VoterService {
  // === CORE CRUD OPERATIONS ===

  /**
   * Get all voters with pagination, filtering, and sorting
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Voters data with pagination
   */
  async getVoters(params = {}) {
    try {
      const response = await api.get('/voters', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get voter by ID
   * @param {string} id - Voter ID
   * @returns {Promise<Object>} Voter data
   */
  async getVoterById(id) {
    try {
      const response = await api.get(`/voters/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new voter
   * @param {Object} voterData - Voter data
   * @returns {Promise<Object>} Created voter data
   */
  async createVoter(voterData) {
    try {
      const response = await api.post('/voters', voterData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update voter
   * @param {string} id - Voter ID
   * @param {Object} voterData - Updated voter data
   * @returns {Promise<Object>} Updated voter data
   */
  async updateVoter(id, voterData) {
    try {
      const response = await api.put(`/voters/${id}`, voterData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Soft delete voter (archive)
   * @param {string} id - Voter ID
   * @returns {Promise<Object>} Archived voter data
   */
  async deleteVoter(id) {
    try {
      const response = await api.delete(`/voters/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Hard delete voter (permanent removal) - admin only
   * @param {string} id - Voter ID
   * @returns {Promise<Object>} Deletion result
   */
  async hardDeleteVoter(id) {
    try {
      const response = await api.delete(`/voters/${id}/hard-delete`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Restore archived voter
   * @param {string} id - Voter ID
   * @returns {Promise<Object>} Restored voter data
   */
  async restoreVoter(id) {
    try {
      const response = await api.patch(`/voters/${id}/restore`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Bulk update voter status (archive/restore)
   * @param {Array<string>} ids - Array of voter IDs
   * @param {string} action - Action to perform ('archive' or 'restore')
   * @returns {Promise<Object>} Bulk operation results
   */
  async bulkUpdateStatus(ids, action) {
    try {
      const response = await api.post('/voters/bulk', { ids, action });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // === BULK OPERATIONS ===

  /**
   * Bulk import voters from file
   * @param {File} file - CSV/Excel file
   * @returns {Promise<Object>} Import results
   */
  async bulkImportVoters(file, duplicateStrategy = 'skip') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicateStrategy', duplicateStrategy);

      const response = await api.post('/voters/bulk/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate bulk import file
   * @param {File} file - CSV/Excel file
   * @returns {Promise<Object>} Validation results
   */
  async validateBulkImport(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/voters/bulk/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get bulk import template
   * @param {string} format - Template format (csv, xlsx)
   * @returns {Promise<Object>} Template data or file download
   */
  async getBulkImportTemplate(format = 'csv') {
    try {
      if (format === 'csv') {
        const response = await api.get(`/voters/bulk/template?format=csv`, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'voter_import_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true };
      }

      // Excel path: fetch JSON template then build .xlsx client-side
      const json = await api.get(`/voters/bulk/template?format=xlsx`);
      const headers = (json.data && json.data.headers) || ['first_name','last_name','middle_name','suffix','birth_date','gender'];
      const rows = (json.data && json.data.data) || [];

      const worksheetData = [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'voter_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // === EXPORT OPERATIONS ===

  /**
   * Export voters
   * @param {string} format - Export format (csv, xlsx, pdf)
   * @param {string} status - Filter by status (active, archived, all)
   * @param {string} selectedIds - Comma-separated list of selected voter IDs (for bulk export)
   * @returns {Promise<Object>} Export data or file download
   */
  async exportVoters(format = 'csv', status = 'active', selectedIds = null) {
    try {
      logger.debug('Exporting voters', { format, status, selectedIdsCount: selectedIds?.length });
      
      const params = new URLSearchParams({ format, status });
      if (selectedIds) {
        params.append('selectedIds', selectedIds);
      }
      
      const response = await api.get(`/voters/export?${params.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });
      
      logger.debug('Export response received', { format, statusCode: response.status });
      
      if (format === 'csv') {
        // Handle file download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `voters_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'Export completed successfully' };
      } else if (format === 'pdf') {
        // Handle PDF export with SKTermReport-style layout
        const voters = response.data?.data || response.data || [];
        logger.debug('Voters for PDF', { voterCount: voters.length });
        
        if (!voters || voters.length === 0) {
          throw new Error('No voter data available for export');
        }
        
        this.generatePDF(voters, status);
        return { success: true, message: 'PDF export completed successfully' };
      }
      
      return response.data;
    } catch (error) {
      logger.error('Export error', error, { format, status });
      throw this.handleError(error);
    }
  }

  /**
   * Export selected voters
   * @param {string} format - Export format (csv, xlsx, pdf)
   * @param {Array} selectedVoters - Array of selected voter data
   * @returns {Promise<Object>} Export data or file download
   */
  async exportSelectedVoters(format = 'csv', selectedVoters = []) {
    try {
      logger.debug('Exporting selected voters', { format, count: selectedVoters.length });
      
      if (!selectedVoters || selectedVoters.length === 0) {
        throw new Error('No voters selected for export');
      }
      
      if (format === 'csv') {
        // Generate CSV from selected voters
        const csvContent = this.generateCSV(selectedVoters);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `selected_voters_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'CSV export completed successfully' };
      } else if (format === 'xlsx') {
        // Generate Excel from selected voters
        const excelContent = this.generateExcel(selectedVoters);
        const blob = new Blob([excelContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `selected_voters_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, message: 'Excel export completed successfully' };
      } else if (format === 'pdf') {
        // Generate PDF from selected voters
        this.generatePDF(selectedVoters, 'selected');
        return { success: true, message: 'PDF export completed successfully' };
      }
      
      throw new Error('Unsupported export format');
    } catch (error) {
      logger.error('Export selected voters error', error, { format, count: selectedVoters.length });
      throw this.handleError(error);
    }
  }

  /**
   * Generate PDF export with SKTermReport-style layout
   * @param {Array} voters - Array of voter data
   * @param {string} status - Current filter status
   */
  generatePDF(voters, status) {
    logger.debug('Generating PDF', { votersCount: voters.length, status });
    
    if (!voters || voters.length === 0) {
      alert('No voter data available for PDF export');
      return;
    }
    
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to generate PDF');
      return;
    }

    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        h2 { font-size: 13px; margin: 6px 0 6px; font-weight: 700; text-transform: uppercase; text-align: center; }
        .sub { font-size: 11px; margin: 0 0 10px; font-weight: 600; text-align: center; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; }
        th, td { border: 1.2px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #eaf2ff !important; font-weight: 700; }
        thead { display: table-header-group; }
        .num { width: 28px; text-align: center; }
        .name { width: 210px; }
        .gender { width: 60px; text-align: center; }
        .birth { width: 100px; text-align: center; }
        .age { width: 40px; text-align: center; }
        .status { width: 80px; text-align: center; }
        .created { width: 120px; text-align: center; }
        .title { text-align: center; font-weight: 700; text-transform: uppercase; }
        @page { size: A4 landscape; margin: 12mm; }
        .section { margin-bottom: 18px; }
        
        /* Enhanced Summary Stats Layout */
        .summary-container { 
          margin-bottom: 20px; 
          display: flex; 
          flex-wrap: wrap; 
          gap: 10px; 
        }
        .summary-card { 
          flex: 1; 
          min-width: 200px; 
          padding: 12px; 
          border: 1px solid #dee2e6; 
          border-radius: 4px; 
          background: #f8f9fa; 
        }
        .summary-card-title { 
          font-size: 12px; 
          font-weight: 700; 
          color: #495057; 
          text-transform: uppercase; 
          margin-bottom: 8px; 
          border-bottom: 1px solid #dee2e6; 
          padding-bottom: 4px; 
        }
        .summary-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 4px; 
          font-size: 11px; 
        }
        .summary-label { 
          font-weight: 600; 
          color: #495057; 
        }
        .summary-value { 
          font-weight: 700; 
          color: #111; 
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
          margin-bottom: 15px;
        }
        .stat-item {
          background: #eaf2ff;
          border: 1px solid #b3d9ff;
          border-radius: 4px;
          padding: 8px;
          text-align: center;
        }
        .stat-number {
          font-size: 16px;
          font-weight: 700;
          color: #0066cc;
          display: block;
        }
        .stat-label {
          font-size: 10px;
          color: #495057;
          text-transform: uppercase;
          font-weight: 600;
        }
      </style>`;

    const header = `
      <thead>
        <tr>
          <th class="num">#</th>
          <th class="name">Name</th>
          <th class="gender">Gender</th>
          <th class="birth">Birth Date</th>
          <th class="age">Age</th>
          <th class="status">Status</th>
          <th class="created">Created At</th>
        </tr>
      </thead>`;

    // Calculate summary statistics - handle both camelCase and snake_case field names
    const totalVoters = voters.length;
    const activeVoters = voters.filter(v => {
      const isActive = v.isActive !== undefined ? v.isActive : v.is_active;
      return isActive;
    }).length;
    const archivedVoters = voters.filter(v => {
      const isActive = v.isActive !== undefined ? v.isActive : v.is_active;
      return !isActive;
    }).length;
    const maleVoters = voters.filter(v => v.gender === 'Male').length;
    const femaleVoters = voters.filter(v => v.gender === 'Female').length;

    // Calculate age distribution
    const now = new Date();
    const childYouth = voters.filter(v => {
      const birthDate = v.birthDate || v.birth_date;
      if (!birthDate) return false;
      const age = Math.floor((now - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.25));
      return age >= 15 && age <= 17;
    }).length;
    const coreYouth = voters.filter(v => {
      const birthDate = v.birthDate || v.birth_date;
      if (!birthDate) return false;
      const age = Math.floor((now - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.25));
      return age >= 18 && age <= 24;
    }).length;
    const youngAdult = voters.filter(v => {
      const birthDate = v.birthDate || v.birth_date;
      if (!birthDate) return false;
      const age = Math.floor((now - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.25));
      return age >= 25 && age <= 30;
    }).length;

    const rows = voters.map((voter, idx) => {
      // Handle both camelCase and snake_case field names
      const birthDate = voter.birthDate || voter.birth_date;
      const firstName = voter.firstName || voter.first_name || '';
      const lastName = voter.lastName || voter.last_name || '';
      const middleName = voter.middleName || voter.middle_name || '';
      const suffix = voter.suffix || '';
      const gender = voter.gender || '';
      const isActive = voter.isActive !== undefined ? voter.isActive : voter.is_active;
      const createdAt = voter.createdAt || voter.created_at;
      
      // Calculate age
      let age = '';
      if (voter.age !== undefined && voter.age !== null) {
        age = voter.age;
      } else if (birthDate) {
        age = Math.floor((now - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 365.25));
      }
      
      const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');
      
      return `
        <tr>
          <td class="num">${idx + 1}</td>
          <td class="name">${fullName.toUpperCase()}</td>
          <td class="gender">${gender ? gender.toUpperCase() : ''}</td>
          <td class="birth">${birthDate ? new Date(birthDate).toLocaleDateString() : ''}</td>
          <td class="age">${age}</td>
          <td class="status">${isActive ? 'ACTIVE' : 'ARCHIVED'}</td>
          <td class="created">${createdAt ? new Date(createdAt).toLocaleDateString() : ''}</td>
        </tr>`;
    }).join('');

    const summary = `
      <div class="summary-container">
        <!-- Key Statistics Grid -->
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">${totalVoters}</span>
            <span class="stat-label">Total Voters</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${activeVoters}</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${archivedVoters}</span>
            <span class="stat-label">Archived</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${maleVoters}</span>
            <span class="stat-label">Male</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${femaleVoters}</span>
            <span class="stat-label">Female</span>
          </div>
        </div>
        
        <!-- Detailed Breakdown Cards -->
        <div class="summary-card">
          <div class="summary-card-title">Age Distribution</div>
          <div class="summary-row">
            <span class="summary-label">Child Youth (15-17):</span>
            <span class="summary-value">${childYouth}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Core Youth (18-24):</span>
            <span class="summary-value">${coreYouth}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Young Adult (25-30):</span>
            <span class="summary-value">${youngAdult}</span>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="summary-card-title">Status Breakdown</div>
          <div class="summary-row">
            <span class="summary-label">Active Voters:</span>
            <span class="summary-value">${activeVoters}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Archived Voters:</span>
            <span class="summary-value">${archivedVoters}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Active Rate:</span>
            <span class="summary-value">${totalVoters > 0 ? Math.round((activeVoters / totalVoters) * 100) : 0}%</span>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="summary-card-title">Gender Distribution</div>
          <div class="summary-row">
            <span class="summary-label">Male Voters:</span>
            <span class="summary-value">${maleVoters}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Female Voters:</span>
            <span class="summary-value">${femaleVoters}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Male Ratio:</span>
            <span class="summary-value">${totalVoters > 0 ? Math.round((maleVoters / totalVoters) * 100) : 0}%</span>
          </div>
        </div>
      </div>`;

    win.document.write(`
      <html>
        <head>
          <title>Voter List Report</title>
          ${styles}
        </head>
        <body>
          <h1>VOTER LIST REPORT</h1>
          <div class="sub">${status === 'all' ? 'All Voters' : status === 'active' ? 'Active Voters Only' : status === 'archived' ? 'Archived Voters Only' : 'Selected Voters'}</div>
          ${summary}
          <table>
            ${header}
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  // === UTILITY METHODS ===

  /**
   * Handle API errors and provide user-friendly messages
   * @param {Error} error - API error
   * @returns {Error} Formatted error with user-friendly message
   */
  handleError(error) {
    logger.error('Voter Service Error', error);

    // Support errors formatted by api.js interceptor (already normalized)
    if (!error.response && typeof error.status === 'number') {
      const status = error.status;
      const data = error.data || {};
      const errorsArr = Array.isArray(error.errors) ? error.errors : [];
      const detailsList = [];
      if (Array.isArray(data?.errors)) detailsList.push(...data.errors);
      // Support object-shaped errors { field: message }
      if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        detailsList.push(...Object.values(data.errors));
      }
      if (Array.isArray(data?.details)) detailsList.push(...data.details);
      if (typeof data?.details === 'string') detailsList.push(data.details);
      if (Array.isArray(data?.suggestions)) detailsList.push(...data.suggestions);
      if (typeof data?.suggestions === 'string') detailsList.push(data.suggestions);
      if (errorsArr.length) detailsList.push(...errorsArr);
      // Include generic fields hint if nothing extracted
      const detailedMsg = detailsList.length > 0 
        ? `: ${detailsList.join('; ')}` 
        : (data && Object.keys(data).length > 0 ? `: ${JSON.stringify(data)}` : '');

      switch (status) {
        case 400:
          throw new Error((error.message || data.message || 'Validation failed') + detailedMsg);
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('Access denied');
        case 404:
          throw new Error('Voter not found');
        case 409:
          throw new Error((error.message || data.message || 'Conflict with existing data') + detailedMsg);
        case 422:
          throw new Error((error.message || data.message || 'Invalid data') + detailedMsg);
        case 429:
          throw new Error('Too many requests. Please try again later.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error((error.message || data?.message) || 'An unexpected error occurred');
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      // Extract detailed messages if provided by backend
      const detailsList = [];
      if (Array.isArray(data?.errors)) detailsList.push(...data.errors);
      if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
        detailsList.push(...Object.values(data.errors));
      }
      if (Array.isArray(data?.details)) detailsList.push(...data.details);
      if (typeof data?.details === 'string') detailsList.push(data.details);
      if (Array.isArray(data?.suggestions)) detailsList.push(...data.suggestions);
      if (typeof data?.suggestions === 'string') detailsList.push(data.suggestions);
      const detailedMsg = detailsList.length > 0 
        ? `: ${detailsList.join('; ')}` 
        : (data && Object.keys(data).length > 0 ? `: ${JSON.stringify(data)}` : '');
      
      // Handle specific error cases
      switch (status) {
        case 400:
          return new Error((data.message || 'Validation failed') + detailedMsg);
        
        case 401:
          return new Error('Authentication required');
        
        case 403:
          return new Error('Access denied');
        
        case 404:
          return new Error('Voter not found');
        
        case 409:
          return new Error((data.message || 'Conflict with existing data') + detailedMsg);
        
        case 413:
          return new Error('File too large. Please use a smaller file.');
        
        case 422:
          return new Error((data.message || 'Invalid data') + detailedMsg);
        
        case 429:
          return new Error('Too many requests. Please try again later.');
        
        case 500:
          return new Error('Server error. Please try again later.');
        
        default:
          return new Error(data?.message || 'An unexpected error occurred');
      }
    }

    if (error.request) {
      return new Error('Network error. Please check your connection.');
    }

    return new Error('An unexpected error occurred');
  }

  /**
   * Transform voter data for frontend display
   * @param {Object} voter - Raw voter data from API
   * @returns {Object} Transformed voter data
   */
  transformVoterData(voter) {
    return {
      voterId: voter.voter_id,
      firstName: voter.first_name,
      lastName: voter.last_name,
      middleName: voter.middle_name || '',
      suffix: voter.suffix || '',
      birthDate: voter.birth_date,
      gender: voter.gender,
      isActive: voter.is_active,
      createdAt: voter.created_at,
      updatedAt: voter.updated_at,
      createdBy: voter.created_by_name || voter.created_by,
      createdByName: voter.created_by_name || voter.created_by,
      // Add participation status
      hasParticipated: voter.has_participated || false,
      surveyCount: voter.survey_count || 0,
      firstSurveyDate: voter.first_survey_date || null,
      // Add computed fields for display
      fullName: `${voter.last_name}, ${voter.first_name}`,
      displayName: `${voter.first_name} ${voter.last_name}`,
      age: this.calculateAge(voter.birth_date),
      status: voter.is_active ? 'active' : 'archived'
    };
  }

  /**
   * Transform voter data for API submission
   * @param {Object} voter - Frontend voter data
   * @returns {Object} API-ready voter data
   */
  transformForAPI(voter) {
    // Normalize birth date to YYYY-MM-DD for backend compatibility
    let normalizedBirthDate = voter.birthDate;
    try {
      const d = new Date(voter.birthDate);
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        normalizedBirthDate = `${yyyy}-${mm}-${dd}`;
      }
    } catch (_) {
      // Keep original if parsing fails; backend will validate
    }

    return {
      first_name: voter.firstName,
      last_name: voter.lastName,
      middle_name: voter.middleName || null,
      suffix: voter.suffix || null,
      birth_date: normalizedBirthDate,
      gender: voter.gender
    };
  }

  /**
   * Calculate age from birth date
   * @param {string} birthDate - Birth date string
   * @returns {number} Age in years
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Validate voter data on frontend
   * @param {Object} voterData - Voter data to validate
   * @returns {Object} Validation result
   */
  validateVoterData(voterData) {
    const errors = [];

    // Required fields
    if (!voterData.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!voterData.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!voterData.birthDate) {
      errors.push('Birth date is required');
    }

    if (!voterData.gender) {
      errors.push('Gender is required');
    }

    // Field length validation
    if (voterData.firstName && voterData.firstName.length > 50) {
      errors.push('First name must be 50 characters or less');
    }

    if (voterData.lastName && voterData.lastName.length > 50) {
      errors.push('Last name must be 50 characters or less');
    }

    if (voterData.middleName && voterData.middleName.length > 50) {
      errors.push('Middle name must be 50 characters or less');
    }

    if (voterData.suffix && voterData.suffix.length > 50) {
      errors.push('Suffix must be 50 characters or less');
    }

    // Gender validation
    if (voterData.gender && !['Male', 'Female'].includes(voterData.gender)) {
      errors.push('Gender must be either "Male" or "Female"');
    }

    // Age validation
    if (voterData.birthDate) {
      const age = this.calculateAge(voterData.birthDate);
      if (age < 18) {
        errors.push('Voter must be at least 18 years old');
      }
      if (age > 120) {
        errors.push('Invalid birth date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate CSV content from voter data
   * @param {Array} voters - Array of voter data
   * @returns {string} CSV content
   */
  generateCSV(voters) {
    const headers = [
      'First Name',
      'Last Name', 
      'Middle Name',
      'Suffix',
      'Birth Date',
      'Gender',
      'Age',
      'Status',
      'Created At'
    ];

    const rows = voters.map(voter => {
      // Handle both frontend (camelCase) and backend (snake_case) field names
      const firstName = voter.firstName || voter.first_name || '';
      const lastName = voter.lastName || voter.last_name || '';
      const middleName = voter.middleName || voter.middle_name || '';
      const suffix = voter.suffix || '';
      const birthDate = voter.birthDate || voter.birth_date || '';
      const gender = voter.gender || '';
      
      // Calculate age properly
      let age = '';
      if (voter.age !== undefined && voter.age !== null) {
        age = voter.age;
      } else if (birthDate) {
        age = this.calculateAge(birthDate);
      }
      
      // Handle status
      const isActive = voter.isActive !== undefined ? voter.isActive : voter.is_active;
      const status = isActive ? 'Active' : 'Archived';
      
      // Handle creation date
      const createdAt = voter.createdAt || voter.created_at || '';
      
      return [
        firstName,
        lastName,
        middleName,
        suffix,
        birthDate,
        gender,
        age,
        status,
        createdAt
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Generate Excel content from voter data
   * @param {Array} voters - Array of voter data
   * @returns {Blob} Excel file blob
   */
  generateExcel(voters) {
    // For now, we'll use a simple CSV approach for Excel
    // In a real implementation, you might want to use a library like SheetJS
    const csvContent = this.generateCSV(voters);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }
}

export default new VoterService();

