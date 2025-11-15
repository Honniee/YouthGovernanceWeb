import api from './api';
import logger from '../utils/logger.js';

/**
 * Survey Submission Service
 * Frontend API service for survey submission tracking
 */
class SurveySubmissionService {
  /**
   * Get survey submission by token (public - for email links)
   */
  async getSubmissionByToken(token) {
    try {
      const response = await api.get(`/survey-submissions/by-token/${token}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting submission by token', error, { token });
      throw error;
    }
  }

  /**
   * Resend email with new token (public - requires reCAPTCHA)
   */
  async resendEmail(youthId, email, recaptchaToken) {
    try {
      const response = await api.post('/survey-submissions/resend-email', {
        youth_id: youthId,
        email: email,
        recaptchaToken: recaptchaToken
      });
      return response.data;
    } catch (error) {
      logger.error('Error resending email', error, { youthId, email });
      throw error;
    }
  }
}

// Export singleton instance
const surveySubmissionService = new SurveySubmissionService();

export default surveySubmissionService;


