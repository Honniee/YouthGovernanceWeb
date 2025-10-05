import api from './api';

/**
 * Survey Responses Service
 * Handles survey response auto-save and submission functionality
 */

/**
 * Save survey response (auto-save or update)
 */
export const saveSurveyResponse = async (responseData) => {
  try {
    const response = await api.post('/survey-responses', responseData);
    return response.data;
  } catch (error) {
    console.error('Error saving survey response:', error);
    throw error;
  }
};

/**
 * Retrieve existing survey response for restoration
 */
export const getSurveyResponse = async (batchId, youthId) => {
  try {
    const response = await api.get('/survey-responses/retrieve', {
      params: { batch_id: batchId, youth_id: youthId }
    });
    return response.data;
  } catch (error) {
    console.error('Error retrieving survey response:', error);
    throw error;
  }
};

/**
 * Submit final survey response
 * @param {string} responseId - The response ID
 * @param {object} responseData - The survey response data
 * @param {string} recaptchaToken - The reCAPTCHA token for verification
 */
export const submitSurveyResponse = async (responseId, responseData, recaptchaToken) => {
  try {
    const response = await api.put(`/survey-responses/${responseId}/submit`, {
      response_data: responseData,
      recaptchaToken: recaptchaToken
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting survey response:', error);
    throw error;
  }
};

/**
 * Check submission status
 */
export const checkSubmissionStatus = async (batchId, youthId) => {
  try {
    const response = await api.get('/survey-responses/check', {
      params: { batch_id: batchId, youth_id: youthId }
    });
    return response.data;
  } catch (error) {
    console.error('Error checking submission status:', error);
    throw error;
  }
};

/**
 * Get batch response statistics
 */
export const getBatchResponseStats = async (batchId) => {
  try {
    const response = await api.get(`/survey-responses/batch/${batchId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error getting batch response stats:', error);
    throw error;
  }
};
