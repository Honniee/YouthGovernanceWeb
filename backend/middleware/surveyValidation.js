import { getClient } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Validate survey submission eligibility
 */
export const validateSurveyEligibility = async (req, res, next) => {
  const client = await getClient();
  
  try {
    const { email, birthDate, barangayId } = req.body;
    const batchId = req.params.batchId || req.body.batchId;
    
    // 1. Check if survey batch is active
    const batchQuery = `
      SELECT status, start_date, end_date, target_age_min, target_age_max 
      FROM "KK_Survey_Batches" 
      WHERE batch_id = $1
    `;
    const batchResult = await client.query(batchQuery, [batchId]);
    
    if (!batchResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }
    
    const batch = batchResult.rows[0];
    const now = new Date();
    const startDate = new Date(batch.start_date);
    const endDate = new Date(batch.end_date);
    
    if (batch.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Survey is not currently active'
      });
    }
    
    if (now < startDate || now > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Survey is outside the active period'
      });
    }
    
    // 2. Check age eligibility
    const age = calculateAge(new Date(birthDate));
    if (age < batch.target_age_min || age > batch.target_age_max) {
      return res.status(400).json({
        success: false,
        message: `Age must be between ${batch.target_age_min} and ${batch.target_age_max} years`
      });
    }
    
    // 3. Check for duplicate submissions
    const duplicateQuery = `
      SELECT response_id FROM "KK_Survey_Responses" 
      WHERE batch_id = $1 AND email = $2
    `;
    const duplicateResult = await client.query(duplicateQuery, [batchId, email]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a response for this survey'
      });
    }
    
    // 4. Validate barangay exists
    const barangayQuery = `SELECT barangay_id FROM "Barangay" WHERE barangay_id = $1`;
    const barangayResult = await client.query(barangayQuery, [barangayId]);
    
    if (!barangayResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid barangay selection'
      });
    }
    
    req.surveyValidation = {
      batchId,
      age,
      isEligible: true
    };
    
    next();
    
  } catch (error) {
    logger.error('Survey validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  } finally {
    client.release();
  }
};

/**
 * Sanitize and validate survey response data
 */
export const sanitizeSurveyData = (req, res, next) => {
  const {
    firstName,
    lastName,
    middleName,
    suffix,
    email,
    contact,
    civilStatus,
    youthClassification,
    educationalBackground,
    workStatus
  } = req.body;
  
  // Sanitize text inputs
  const sanitizedData = {
    firstName: sanitizeText(firstName),
    lastName: sanitizeText(lastName),
    middleName: sanitizeText(middleName),
    suffix: sanitizeText(suffix),
    email: email.toLowerCase().trim(),
    contact: sanitizePhone(contact),
    civilStatus: validateEnum(civilStatus, [
      'Single', 'Married', 'Widowed', 'Divorced', 'Separated', 'Annulled', 'Unknown', 'Live-in'
    ]),
    youthClassification: validateEnum(youthClassification, [
      'In School Youth', 'Out of School Youth', 'Working Youth', 'Youth w/Specific Needs'
    ]),
    educationalBackground: validateEnum(educationalBackground, [
      'Elementary Level', 'Elementary Grad', 'High School Level', 'High School Grad',
      'Vocational Grad', 'College Level', 'College Grad', 'Masters Level',
      'Masters Grad', 'Doctorate Level', 'Doctorate Graduate'
    ]),
    workStatus: validateEnum(workStatus, [
      'Employed', 'Unemployed', 'Self-Employed', 'Currently looking for a Job', 'Not interested looking for a job'
    ])
  };
  
  req.sanitizedData = sanitizedData;
  next();
};

// Helper functions
const calculateAge = (birthDate) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const sanitizeText = (text) => {
  if (!text) return '';
  return text.trim().replace(/[<>]/g, '');
};

const sanitizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^\d+\-\s()]/g, '');
};

const validateEnum = (value, allowedValues) => {
  return allowedValues.includes(value) ? value : null;
};
