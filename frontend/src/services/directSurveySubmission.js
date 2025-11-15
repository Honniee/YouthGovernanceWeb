import api from './api';
import logger from '../utils/logger.js';

/**
 * Direct Survey Submission Service
 * Handles direct submission of survey data to the database
 * Bypasses the complex session system for immediate submission
 */

/**
 * Submit survey data directly to the database
 * @param {object} surveyData - Complete survey data
 * @param {string} recaptchaToken - reCAPTCHA verification token
 */
export const submitSurveyDirectly = async (surveyData, recaptchaToken) => {
  try {
    logger.debug('Submitting survey data directly', { surveyDataKeys: Object.keys(surveyData || {}) });
    
    const response = await api.post('/survey-responses/direct-submit', {
      survey_data: surveyData,
      recaptcha_token: recaptchaToken
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error submitting survey directly', error);
    throw error;
  }
};

/**
 * Create a youth profile and submit survey in one operation
 * @param {object} personalData - Personal information data
 * @param {object} surveyData - Complete survey data
 * @param {string} recaptchaToken - reCAPTCHA verification token
 * @param {object} acceptedSections - Consent/terms acceptance data
 */
export const createProfileAndSubmitSurvey = async (personalData, surveyData, recaptchaToken, acceptedSections = null) => {
  try {
    logger.debug('Creating profile and submitting survey', { personalDataKeys: Object.keys(personalData || {}), surveyDataKeys: Object.keys(surveyData || {}) });
    
    const requestBody = {
      personal_data: personalData,
      survey_data: surveyData,
      recaptchaToken: recaptchaToken
    };
    
    // Include consent data if provided
    if (acceptedSections) {
      requestBody.acceptedSections = acceptedSections;
      requestBody.consent = acceptedSections; // Also include as 'consent' for backend compatibility
    }
    
    const response = await api.post('/survey-responses/create-and-submit', requestBody);
    
    return response.data;
  } catch (error) {
    logger.error('Error creating profile and submitting survey', error);
    throw error;
  }
};
