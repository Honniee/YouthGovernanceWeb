import api from './api';
import logger from '../utils/logger.js';

/**
 * Data Subject Rights Service
 * Frontend API service for data subject rights requests
 */
class DataSubjectRightsService {
  /**
   * Create a data subject rights request
   */
  async createRequest(requestData, recaptchaToken = null) {
    try {
      const payload = {
        ...requestData,
      };

      if (recaptchaToken) {
        payload.recaptchaToken = recaptchaToken;
      }

      const response = await api.post('/data-subject-rights/requests', payload);
      return response.data;
    } catch (error) {
      logger.error('Error creating data subject rights request', error, { requestData });
      throw error;
    }
  }

  /**
   * Get request by ID (authenticated)
   */
  async getRequest(requestId) {
    try {
      const response = await api.get(`/data-subject-rights/requests/${requestId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting request', error, { requestId });
      throw error;
    }
  }

  /**
   * Get request by token (public - for email links)
   */
  async getRequestByToken(token) {
    try {
      const response = await api.get(`/data-subject-rights/requests/by-token/${token}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting request by token', error, { token });
      throw error;
    }
  }

  /**
   * List requests (authenticated)
   */
  async listRequests(filters = {}) {
    try {
      const response = await api.get('/data-subject-rights/requests', { params: filters });
      return response.data;
    } catch (error) {
      logger.error('Error listing requests', error, { filters });
      throw error;
    }
  }

  /**
   * Get request statistics (admin only)
   */
  async getStatistics() {
    try {
      const response = await api.get('/data-subject-rights/statistics');
      return response.data;
    } catch (error) {
      logger.error('Error getting statistics', error);
      throw error;
    }
  }

  /**
   * Update request status (admin only)
   */
  async updateRequestStatus(requestId, status, notes = null) {
    try {
      const response = await api.patch(`/data-subject-rights/requests/${requestId}/status`, {
        status,
        notes,
      });
      return response.data;
    } catch (error) {
      logger.error('Error updating request status', error, { requestId, status });
      throw error;
    }
  }

  /**
   * Process access request (admin only)
   */
  async processAccessRequest(requestId) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-access`);
      return response.data;
    } catch (error) {
      logger.error('Error processing access request', error, { requestId });
      throw error;
    }
  }

  /**
   * Process rectification request (admin only)
   */
  async processRectificationRequest(requestId, corrections) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-rectification`, {
        corrections,
      });
      return response.data;
    } catch (error) {
      logger.error('Error processing rectification request', error, { requestId });
      throw error;
    }
  }

  /**
   * Process erasure request (admin only)
   */
  async processErasureRequest(requestId) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-erasure`);
      return response.data;
    } catch (error) {
      logger.error('Error processing erasure request', error, { requestId });
      throw error;
    }
  }

  /**
   * Process portability request (admin only)
   */
  async processPortabilityRequest(requestId) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-portability`);
      return response.data;
    } catch (error) {
      logger.error('Error processing portability request', error, { requestId });
      throw error;
    }
  }

  /**
   * Process objection request (admin only)
   */
  async processObjectionRequest(requestId) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-objection`);
      return response.data;
    } catch (error) {
      logger.error('Error processing objection request', error, { requestId });
      throw error;
    }
  }

  /**
   * Process consent withdrawal request (admin only)
   */
  async processConsentWithdrawalRequest(requestId) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/process-consent-withdrawal`);
      return response.data;
    } catch (error) {
      logger.error('Error processing consent withdrawal request', error, { requestId });
      throw error;
    }
  }

  /**
   * Verify identity (admin only)
   */
  async verifyIdentity(requestId, verificationMethod) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/verify-identity`, {
        verificationMethod,
      });
      return response.data;
    } catch (error) {
      logger.error('Error verifying identity', error, { requestId, verificationMethod });
      throw error;
    }
  }

  /**
   * Assign request (admin only)
   */
  async assignRequest(requestId, assignedTo) {
    try {
      const response = await api.post(`/data-subject-rights/requests/${requestId}/assign`, {
        assignedTo,
      });
      return response.data;
    } catch (error) {
      logger.error('Error assigning request', error, { requestId, assignedTo });
      throw error;
    }
  }
}

// Export singleton instance
const dataSubjectRightsService = new DataSubjectRightsService();

export default dataSubjectRightsService;


