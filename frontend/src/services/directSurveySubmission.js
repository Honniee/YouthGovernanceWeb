import api from './api';

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
    console.log('📤 Submitting survey data directly:', surveyData);
    
    const response = await api.post('/survey-responses/direct-submit', {
      survey_data: surveyData,
      recaptcha_token: recaptchaToken
    });
    
    return response.data;
  } catch (error) {
    console.error('Error submitting survey directly:', error);
    throw error;
  }
};

/**
 * Create a youth profile and submit survey in one operation
 * @param {object} personalData - Personal information data
 * @param {object} surveyData - Complete survey data
 * @param {string} recaptchaToken - reCAPTCHA verification token
 */
export const createProfileAndSubmitSurvey = async (personalData, surveyData, recaptchaToken) => {
  try {
    console.log('📤 Creating profile and submitting survey:', { personalData, surveyData });
    
    const response = await api.post('/survey-responses/create-and-submit', {
      personal_data: personalData,
      survey_data: surveyData,
      recaptchaToken: recaptchaToken
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating profile and submitting survey:', error);
    throw error;
  }
};
