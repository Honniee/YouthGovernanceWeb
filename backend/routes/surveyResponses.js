import express from 'express';
import {
  saveSurveyResponse,
  getSurveyResponse,
  submitSurveyResponse,
  checkSubmissionStatus,
  getBatchResponseStats
} from '../controllers/surveyResponsesController.js';
import { createProfileAndSubmitSurvey } from '../controllers/directSurveySubmissionController.js';
import { verifyRecaptcha, bypassRecaptchaInDev } from '../middleware/recaptcha.js';

const router = express.Router();

// Create or update survey response (auto-save) - NO reCAPTCHA needed for auto-save
router.post('/', saveSurveyResponse);

// Retrieve existing survey response
router.get('/retrieve', getSurveyResponse);

// Submit final survey response - REQUIRES reCAPTCHA verification
router.put('/:response_id/submit', [
  process.env.NODE_ENV === 'production' ? verifyRecaptcha : bypassRecaptchaInDev
], submitSurveyResponse);

// Check submission status
router.get('/check', checkSubmissionStatus);

// Get batch response statistics
router.get('/batch/:batch_id/stats', getBatchResponseStats);

// Direct survey submission - creates profile and submits in one operation
router.post('/create-and-submit', [
  process.env.NODE_ENV === 'production' ? verifyRecaptcha : bypassRecaptchaInDev
], createProfileAndSubmitSurvey);

export default router;
