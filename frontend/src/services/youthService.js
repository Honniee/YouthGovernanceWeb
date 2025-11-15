import api from './api';
import logger from '../utils/logger.js';

const youthService = {
  async getYouth(params = {}) {
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const qs = query.toString();
      const url = `/youth${qs ? `?${qs}` : ''}`; // resolves to /api/youth via axios baseURL
      const res = await api.get(url);
      // Expected shape: { success, data: [...], stats? }
      return res?.data || res;
    } catch (e) {
      logger.error('youthService.getYouth error', e, { params });
      return { success: false, message: e?.message || 'Failed to fetch youth' };
    }
  },

  transformYouth(row = {}) {
    // Map backend fields to UI fields; adjust as needed based on backend
    return {
      id: row.youth_id || row.id || row._id || '',
      name: row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.full_name || '',
      firstName: row.first_name || row.firstName,
      lastName: row.last_name || row.lastName,
      email: row.email || row.email_address || '',
      phone: row.phone || row.contact_number || '',
      age: row.age || row.youth_age || '',
      location: row.barangay_name || row.barangay || row.location || '',
      status: row.status || 'Active',
      validationStatus: row.validation_status || 'Auto-Validated',
      isInVotersList: row.in_voters_list ?? row.isInVotersList ?? false,
      surveysAnswered: row.surveys_answered || row.surveysAnswered || 0,
      lastSurveyDate: row.last_survey_date || row.lastSurveyDate || null,
      surveys: row.surveys || [],
      createdAt: row.created_at || row.createdAt || null,
    };
  },
};

export default youthService;



