import db, { getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import { validateYouthProfile } from '../utils/validation.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import { maskEmail, maskContact, extractBirthYear } from '../utils/dataMasking.js';
import emailService from '../services/emailService.js';
import consentService from '../services/consentService.js';
import dataRetentionService from '../services/dataRetentionService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import logger from '../utils/logger.js';

/**
 * Direct Survey Submission Controller
 * Handles direct submission of survey data with proper business logic
 */

/**
 * Check voter match with flexible name matching (handles typos)
 * @param {object} personalData - Personal information data
 * @param {object} client - Database client
 * @returns {object} - Match result with detailed scoring
 */
const checkVoterMatch = async (personalData, client) => {
  try {
    const { first_name, last_name, middle_name, suffix, birth_date, gender } = personalData;
    
    logger.debug('Checking voter match with flexible matching (including middle name and suffix)', {
      first_name,
      last_name,
      middle_name,
      suffix,
      birth_date,
      gender
    });
    
    // Check for exact match first (including middle name and suffix)
    const exactMatch = await client.query(`
      SELECT voter_id FROM "Voters_List"
      WHERE first_name = $1 
        AND last_name = $2 
        AND (middle_name = $3 OR (middle_name IS NULL AND $3 IS NULL))
        AND (suffix = $4 OR (suffix IS NULL AND $4 IS NULL))
        AND birth_date = $5 
        AND gender = $6
    `, [first_name, last_name, middle_name, suffix, birth_date, gender]);
    
    if (exactMatch.rows.length > 0) {
      logger.info('Exact voter match found');
      return {
        hasMatch: true,
        voter_id: exactMatch.rows[0].voter_id,
        matchType: 'exact',
        score: 100,
        details: 'Perfect match on all fields'
      };
    }
    
    // Check for flexible name match with birth date and gender (including middle name and suffix)
    // This handles typos like "maria" to "maiaa" or "maria" to "mariaa"
    const flexibleMatch = await client.query(`
      SELECT voter_id FROM "Voters_List"
      WHERE (
        -- First name variations (handles typos)
        (first_name ILIKE $1 OR first_name ILIKE $2 OR first_name ILIKE $3 OR first_name ILIKE $4)
        AND
        -- Last name variations (handles typos)
        (last_name ILIKE $5 OR last_name ILIKE $6 OR last_name ILIKE $7 OR last_name ILIKE $8)
        AND
        -- Middle name variations (handles typos and missing middle names)
        (
          (middle_name ILIKE $9 OR middle_name ILIKE $10 OR middle_name ILIKE $11 OR middle_name ILIKE $12)
          OR (middle_name IS NULL AND $9 IS NULL)
        )
        AND
        -- Suffix variations (handles typos and missing suffixes)
        (
          (suffix ILIKE $13 OR suffix ILIKE $14 OR suffix ILIKE $15 OR suffix ILIKE $16)
          OR (suffix IS NULL AND $13 IS NULL)
        )
      )
      AND birth_date = $17 
      AND gender = $18
    `, [
      first_name,                    // Exact match
      `%${first_name}%`,            // Contains the name
      `${first_name}%`,             // Starts with the name
      `%${first_name}`,            // Ends with the name
      last_name,                    // Exact match
      `%${last_name}%`,            // Contains the name
      `${last_name}%`,             // Starts with the name
      `%${last_name}`,             // Ends with the name
      middle_name,                  // Exact match
      `%${middle_name}%`,          // Contains the name
      `${middle_name}%`,           // Starts with the name
      `%${middle_name}`,           // Ends with the name
      suffix,                      // Exact match
      `%${suffix}%`,              // Contains the name
      `${suffix}%`,               // Starts with the name
      `%${suffix}`,               // Ends with the name
      birth_date,
      gender
    ]);
    
    if (flexibleMatch.rows.length > 0) {
      logger.info('Flexible name match found');
      return {
        hasMatch: true,
        voter_id: flexibleMatch.rows[0].voter_id,
        matchType: 'strong',
        score: 95,
        details: 'Match with name variations (handles typos)'
      };
    }
    
    // Check for name match with birth date only (ignore gender typos, include middle name and suffix)
    const nameBirthFlexible = await client.query(`
      SELECT voter_id FROM "Voters_List"
      WHERE (
        (first_name ILIKE $1 OR first_name ILIKE $2 OR first_name ILIKE $3 OR first_name ILIKE $4)
        AND
        (last_name ILIKE $5 OR last_name ILIKE $6 OR last_name ILIKE $7 OR last_name ILIKE $8)
        AND
        (
          (middle_name ILIKE $9 OR middle_name ILIKE $10 OR middle_name ILIKE $11 OR middle_name ILIKE $12)
          OR (middle_name IS NULL AND $9 IS NULL)
        )
        AND
        (
          (suffix ILIKE $13 OR suffix ILIKE $14 OR suffix ILIKE $15 OR suffix ILIKE $16)
          OR (suffix IS NULL AND $13 IS NULL)
        )
      )
      AND birth_date = $17
    `, [
      first_name,
      `%${first_name}%`,
      `${first_name}%`,
      `%${first_name}`,
      last_name,
      `%${last_name}%`,
      `${last_name}%`,
      `%${last_name}`,
      middle_name,
      `%${middle_name}%`,
      `${middle_name}%`,
      `%${middle_name}`,
      suffix,
      `%${suffix}%`,
      `${suffix}%`,
      `%${suffix}`,
      birth_date
    ]);
    
    if (nameBirthFlexible.rows.length > 0) {
      logger.info('Name + birth date flexible match found');
      return {
        hasMatch: true,
        voter_id: nameBirthFlexible.rows[0].voter_id,
        matchType: 'strong',
        score: 90,
        details: 'Match with name variations and birth date (gender differs)'
      };
    }
    
    // Check for name match with gender only (ignore birth date typos, include middle name and suffix)
    const nameGenderFlexible = await client.query(`
      SELECT voter_id FROM "Voters_List"
      WHERE (
        (first_name ILIKE $1 OR first_name ILIKE $2 OR first_name ILIKE $3 OR first_name ILIKE $4)
        AND
        (last_name ILIKE $5 OR last_name ILIKE $6 OR last_name ILIKE $7 OR last_name ILIKE $8)
        AND
        (
          (middle_name ILIKE $9 OR middle_name ILIKE $10 OR middle_name ILIKE $11 OR middle_name ILIKE $12)
          OR (middle_name IS NULL AND $9 IS NULL)
        )
        AND
        (
          (suffix ILIKE $13 OR suffix ILIKE $14 OR suffix ILIKE $15 OR suffix ILIKE $16)
          OR (suffix IS NULL AND $13 IS NULL)
        )
      )
      AND gender = $17
    `, [
      first_name,
      `%${first_name}%`,
      `${first_name}%`,
      `%${first_name}`,
      last_name,
      `%${last_name}%`,
      `${last_name}%`,
      `%${last_name}`,
      middle_name,
      `%${middle_name}%`,
      `${middle_name}%`,
      `%${middle_name}`,
      suffix,
      `%${suffix}%`,
      `${suffix}%`,
      `%${suffix}`,
      gender
    ]);
    
    if (nameGenderFlexible.rows.length > 0) {
      logger.info('Name + gender flexible match found');
      return {
        hasMatch: true,
        voter_id: nameGenderFlexible.rows[0].voter_id,
        matchType: 'strong',
        score: 85,
        details: 'Match with name variations and gender (birth date differs)'
      };
    }
    
    // Check for very flexible name match (handles major typos, include middle name and suffix)
    const veryFlexibleMatch = await client.query(`
      SELECT voter_id FROM "Voters_List"
      WHERE (
        -- Very flexible first name matching
        (first_name ILIKE $1 OR first_name ILIKE $2 OR first_name ILIKE $3)
        AND
        -- Very flexible last name matching
        (last_name ILIKE $4 OR last_name ILIKE $5 OR last_name ILIKE $6)
        AND
        -- Very flexible middle name matching (handles missing middle names)
        (
          (middle_name ILIKE $7 OR middle_name ILIKE $8 OR middle_name ILIKE $9)
          OR (middle_name IS NULL AND $7 IS NULL)
        )
        AND
        -- Very flexible suffix matching (handles missing suffixes)
        (
          (suffix ILIKE $10 OR suffix ILIKE $11 OR suffix ILIKE $12)
          OR (suffix IS NULL AND $10 IS NULL)
        )
      )
      AND birth_date = $13
    `, [
      `%${first_name.substring(0, 3)}%`,  // First 3 characters
      `%${first_name.substring(0, 4)}%`,  // First 4 characters
      `%${first_name.substring(0, 5)}%`,  // First 5 characters
      `%${last_name.substring(0, 3)}%`,   // First 3 characters
      `%${last_name.substring(0, 4)}%`,   // First 4 characters
      `%${last_name.substring(0, 5)}%`,   // First 5 characters
      middle_name ? `%${middle_name.substring(0, 3)}%` : null,  // First 3 characters
      middle_name ? `%${middle_name.substring(0, 4)}%` : null,  // First 4 characters
      middle_name ? `%${middle_name.substring(0, 5)}%` : null,  // First 5 characters
      suffix ? `%${suffix.substring(0, 3)}%` : null,  // First 3 characters
      suffix ? `%${suffix.substring(0, 4)}%` : null,  // First 4 characters
      suffix ? `%${suffix.substring(0, 5)}%` : null,  // First 5 characters
      birth_date
    ]);
    
    if (veryFlexibleMatch.rows.length > 0) {
      logger.info('Very flexible name match found');
      return {
        hasMatch: true,
        voter_id: veryFlexibleMatch.rows[0].voter_id,
        matchType: 'partial',
        score: 75,
        details: 'Match with major name variations and birth date'
      };
    }
    
    // No match found
    logger.debug('No voter match found');
    return {
      hasMatch: false,
      voter_id: null,
      matchType: 'none',
      score: 0,
      details: 'No matching voter record found'
    };
    
  } catch (error) {
    logger.error('Error checking voter match', {
      error: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    // If there's an error checking voters table, default to no match
    return {
      hasMatch: false,
      voter_id: null,
      matchType: 'none',
      score: 0,
      details: 'Error checking voter records',
      error: error.message
    };
  }
};

/**
 * Submit survey data directly to the database
 * Creates a youth profile and survey response in one operation
 */
const createProfileAndSubmitSurvey = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { personal_data, survey_data, recaptchaToken } = req.body;
    
    // DEBUG: Log the incoming data
    logger.debug('Incoming request data', {
      personal_data: personal_data,
      survey_data_keys: Object.keys(survey_data || {}),
      recaptchaToken: recaptchaToken ? 'Present' : 'Missing'
    });
    
    // DEBUG: Test database connection
    logger.debug('Testing database connection');
    const testQuery = await client.query('SELECT NOW() as current_time');
    logger.debug('Database connection successful', { current_time: testQuery.rows[0] });

    // 1. Map frontend field names to backend field names
    const mappedPersonalData = {
      first_name: personal_data.firstName,
      last_name: personal_data.lastName,
      middle_name: personal_data.middleName,
      suffix: personal_data.suffix,
      age: personal_data.age,
      gender: personal_data.sexAtBirth === 'Other' ? 'Male' : personal_data.sexAtBirth,
      contact_number: personal_data.contactNumber,
      email: personal_data.email ? String(personal_data.email).trim() : null,
      barangay_id: personal_data.barangay,
      purok_zone: personal_data.purok,
      birth_date: personal_data.birthday
    };

    logger.debug('Mapped personal data for validation', {
      first_name: mappedPersonalData.first_name,
      last_name: mappedPersonalData.last_name,
      birth_date: mappedPersonalData.birth_date,
      gender: mappedPersonalData.gender,
      birth_date_type: typeof mappedPersonalData.birth_date
    });

    logger.debug('Mapped personal data', { mappedPersonalData });
    logger.debug('EMAIL DEBUG - Raw email from frontend', {
      raw: personal_data.email,
      type: typeof personal_data.email,
      length: personal_data.email ? personal_data.email.length : 0,
      trimmed: mappedPersonalData.email,
      trimmedLength: mappedPersonalData.email ? mappedPersonalData.email.length : 0
    });

    // 2. Check if youth profile already exists by name + gender + birth_date OR by contact/email
    logger.debug('Checking if youth profile exists');
    // Normalize suffix: treat empty string as NULL for database comparison
    const normalizedSuffix = (mappedPersonalData.suffix === '' || mappedPersonalData.suffix === null || mappedPersonalData.suffix === undefined) ? null : mappedPersonalData.suffix;
    const normalizedMiddleName = (mappedPersonalData.middle_name === '' || mappedPersonalData.middle_name === null || mappedPersonalData.middle_name === undefined) ? null : mappedPersonalData.middle_name;
    
    // Query to find existing youth by name+DOB+gender OR by contact/email
    // We'll do the suffix/middle_name comparison in JavaScript after fetching
    // This is simpler and more reliable than complex SQL NULL handling
    // Email comparison should be case-insensitive (LOWER())
    const existingYouthCheck = await client.query(`
      SELECT yp.youth_id, u.user_id, yp.validation_status, yp.validation_tier
      FROM "Youth_Profiling" yp
      LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
      WHERE (
        -- Check by name + gender + birth_date (exact match on first, last, gender, DOB)
        -- We'll check middle_name and suffix in JavaScript for proper NULL/empty string handling
        (yp.first_name = $1 
         AND yp.last_name = $2 
         AND yp.gender = $3 
         AND yp.birth_date = $4)
        OR
        -- Check by contact number (unique constraint)
        yp.contact_number = $5
        OR
        -- Check by email (unique constraint) - case-insensitive comparison
        (yp.email IS NOT NULL AND LOWER(TRIM(yp.email)) = LOWER(TRIM($6)))
      )
    `, [
      mappedPersonalData.first_name,
      mappedPersonalData.last_name, 
      mappedPersonalData.gender,
      mappedPersonalData.birth_date,
      mappedPersonalData.contact_number,
      mappedPersonalData.email
    ]);
    
    logger.debug(`Query found ${existingYouthCheck.rows.length} matching profile(s)`);

    let youth_id;
    let user_id;
    let isNewYouth = false;

    if (existingYouthCheck.rows.length > 0) {
      // Youth profile exists - use existing IDs
      // If multiple matches, prioritize by: 1) exact name match, 2) contact match, 3) email match
      let matchedProfile = existingYouthCheck.rows[0];
      
      // If multiple matches found, try to find the best match
      if (existingYouthCheck.rows.length > 1) {
        logger.warn(`Multiple profiles found (${existingYouthCheck.rows.length}), selecting best match`);
        // Prefer exact name match over contact/email match
        for (const row of existingYouthCheck.rows) {
          // We'll check full name match in the next query
          matchedProfile = row;
          break; // Use first match for now, will verify in next step
        }
      }
      
      youth_id = matchedProfile.youth_id;
      user_id = matchedProfile.user_id;
      logger.info(`Found existing youth profile: ${youth_id}`);
      
      // Check if this is a duplicate submission attempt with different details
      // Get full profile details including middle_name and suffix for comparison
      const existingProfile = await client.query(`
        SELECT first_name, last_name, middle_name, suffix, contact_number, email, barangay_id, birth_date, gender
        FROM "Youth_Profiling" 
        WHERE youth_id = $1
      `, [youth_id]);
      
      if (existingProfile.rows.length > 0) {
        const existing = existingProfile.rows[0];
        logger.debug('Existing profile data', {
          first_name: existing.first_name,
          last_name: existing.last_name,
          middle_name: existing.middle_name,
          suffix: existing.suffix,
          contact_number: existing.contact_number,
          email: existing.email,
          barangay_id: existing.barangay_id
        });
        logger.debug('New submission data', {
          first_name: mappedPersonalData.first_name,
          last_name: mappedPersonalData.last_name,
          middle_name: mappedPersonalData.middle_name,
          suffix: mappedPersonalData.suffix,
          contact_number: mappedPersonalData.contact_number,
          email: mappedPersonalData.email,
          barangay_id: mappedPersonalData.barangay_id
        });
        
        const isContactMatch = existing.contact_number === mappedPersonalData.contact_number;
        // Email comparison should be case-insensitive
        const isEmailMatch = existing.email && mappedPersonalData.email && 
                             existing.email.toLowerCase().trim() === mappedPersonalData.email.toLowerCase().trim();
        logger.debug(`Contact match: ${isContactMatch}`, { existing: existing.contact_number, new: mappedPersonalData.contact_number });
        logger.debug(`Email match: ${isEmailMatch}`, { existing: existing.email, new: mappedPersonalData.email });
        
        // Check full name match (first, last, middle, suffix) - consistent with database query
        // Handle NULL values properly: match if both are NULL, or both have the same non-NULL value
        // This matches the database query logic: (field = $value OR (field IS NULL AND $value IS NULL))
        const isFirstNameMatch = existing.first_name === mappedPersonalData.first_name;
        const isLastNameMatch = existing.last_name === mappedPersonalData.last_name;
        
        // For middle_name: normalize to null if empty/undefined, then compare
        // Use a helper function to normalize middle name values
        const normalizeMiddleName = (value) => {
          if (value === null || value === undefined) return null;
          const str = String(value).trim();
          return str === '' ? null : str;
        };
        
        const existingMiddleName = normalizeMiddleName(existing.middle_name);
        const newMiddleName = normalizeMiddleName(mappedPersonalData.middle_name);
        const isMiddleNameMatch = existingMiddleName === newMiddleName;
        
        logger.debug('Middle name normalization', {
          existing: existing.middle_name,
          existingType: typeof existing.middle_name,
          existingNormalized: existingMiddleName,
          new: mappedPersonalData.middle_name,
          newType: typeof mappedPersonalData.middle_name,
          newNormalized: newMiddleName,
          match: isMiddleNameMatch
        });
        
        // For suffix: normalize to null if empty/undefined, then compare
        // Both null and empty string should be treated as "no suffix"
        // Use a helper function to normalize suffix values - be very explicit about null/empty handling
        const normalizeSuffix = (value) => {
          // Explicitly check for null, undefined, empty string, or whitespace-only string
          if (value === null || value === undefined) {
            return null;
          }
          // Convert to string and trim
          const str = String(value).trim();
          // If after trimming it's empty, treat as null
          if (str === '' || str.length === 0) {
            return null;
          }
          return str;
        };
        
        const existingSuffixRaw = existing.suffix;
        const newSuffixRaw = mappedPersonalData.suffix;
        const existingSuffix = normalizeSuffix(existingSuffixRaw);
        const newSuffix = normalizeSuffix(newSuffixRaw);
        const isSuffixMatch = existingSuffix === newSuffix;
        
        logger.debug('Suffix comparison', {
          existingRaw: existingSuffixRaw,
          existingType: typeof existingSuffixRaw,
          existingValue: JSON.stringify(existingSuffixRaw),
          newRaw: newSuffixRaw,
          newType: typeof newSuffixRaw,
          newValue: JSON.stringify(newSuffixRaw),
          existingNormalized: JSON.stringify(existingSuffix),
          newNormalized: JSON.stringify(newSuffix),
          match: isSuffixMatch,
          comparison: `${existingSuffix} === ${newSuffix}`
        });
        
        const isNameMatch = isFirstNameMatch && isLastNameMatch && isMiddleNameMatch && isSuffixMatch;
        const isBarangayMatch = existing.barangay_id === mappedPersonalData.barangay_id;
        
        logger.debug('Name comparison details', {
          firstMatch: isFirstNameMatch,
          lastMatch: isLastNameMatch,
          middleMatch: isMiddleNameMatch,
          middleExisting: existingMiddleName,
          middleNew: newMiddleName,
          suffixMatch: isSuffixMatch,
          suffixExisting: existingSuffix,
          suffixNew: newSuffix,
          overallNameMatch: isNameMatch
        });
        
        logger.debug(`Name match: ${isNameMatch}`, {
          first: isFirstNameMatch,
          last: isLastNameMatch,
          middle: isMiddleNameMatch,
          suffix: isSuffixMatch
        });
        logger.debug(`Barangay match: ${isBarangayMatch}`);
        
        // SCENARIO 1: Same contact/email but different name - REJECT (potential fraud/error)
        if ((isContactMatch || isEmailMatch) && !isNameMatch) {
          await client.query('ROLLBACK');
          
          // Determine which field is causing the conflict
          let conflictField = '';
          if (isContactMatch && isEmailMatch) {
            conflictField = 'mobile number and email';
          } else if (isContactMatch) {
            conflictField = 'mobile number';
          } else if (isEmailMatch) {
            conflictField = 'email';
          }
          
          // Create audit log for failed submission (duplicate)
          try {
            await createAuditLog({
              userId: 'anonymous',
              userType: 'youth',
              action: 'SUBMIT_SURVEY_FAILED',
              resource: '/api/survey-responses/create-and-submit',
              resourceId: null,
              resourceName: 'Survey Submission Failed - Duplicate Contact',
              resourceType: 'survey-response',
              category: 'Survey Management',
              details: {
                error_type: 'duplicate_contact_with_different_details',
                conflict_field: conflictField,
                existing_youth_id: youth_id
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              status: 'error',
              errorMessage: `Duplicate ${conflictField} with different details`
            });
          } catch (auditError) {
            logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
          }
          
          return res.status(400).json({
            success: false,
            message: `A profile with this ${conflictField} already exists with different youth information. Please use the correct details or contact support.`,
            error: 'duplicate_contact_with_different_details',
            conflictField: conflictField
          });
        }
        
        // SCENARIO 2: Same full name (first, middle, last, suffix if any), gender, DOB, and EMAIL - REJECT AS DUPLICATE
        // If name, gender, DOB, and email all match, it's definitely the same person
        // Even if contact number is different, email is a stronger identifier
        if (isNameMatch && isEmailMatch) {
          logger.warn('DUPLICATE DETECTED: Same full name (first, middle, last, suffix if any), gender, DOB, and email');
          logger.warn('This is definitely the same person - rejecting as duplicate', {
            existing: `${existing.contact_number} / ${existing.email}`,
            new: `${mappedPersonalData.contact_number} / ${mappedPersonalData.email}`
          });
          
          // Check for existing responses to provide better error message (before rollback)
          const activeBatchCheck = await client.query(`
            SELECT batch_id, batch_name FROM "KK_Survey_Batches" 
            WHERE status = 'active' 
            ORDER BY created_at DESC 
            LIMIT 1
          `);
          
          let existingResponseInfo = null;
          if (activeBatchCheck.rows.length > 0) {
            const batch_id = activeBatchCheck.rows[0].batch_id;
            const existingResponse = await client.query(`
              SELECT response_id, validation_status, created_at 
              FROM "KK_Survey_Responses"
              WHERE batch_id = $1 AND youth_id = $2
              ORDER BY created_at DESC
              LIMIT 1
            `, [batch_id, youth_id]);
            
            if (existingResponse.rows.length > 0) {
              existingResponseInfo = {
                response_id: existingResponse.rows[0].response_id,
                validation_status: existingResponse.rows[0].validation_status,
                created_at: existingResponse.rows[0].created_at
              };
            }
          }
          
          await client.query('ROLLBACK');
          
          // Create audit log for failed submission (duplicate)
          try {
            await createAuditLog({
              userId: 'anonymous',
              userType: 'youth',
              action: 'SUBMIT_SURVEY_FAILED',
              resource: '/api/survey-responses/create-and-submit',
              resourceId: existingResponseInfo?.response_id || null,
              resourceName: 'Survey Submission Failed - Duplicate (Name + Email Match)',
              resourceType: 'survey-response',
              category: 'Survey Management',
              details: {
                error_type: 'duplicate_name_email_match',
                existing_youth_id: youth_id,
                existing_name: `${existing.first_name} ${existing.last_name}`,
                existing_email: existing.email,
                existing_contact: existing.contact_number,
                new_contact: mappedPersonalData.contact_number,
                existing_response: existingResponseInfo
              },
              ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
              userAgent: req.get('User-Agent'),
              status: 'error',
              errorMessage: 'Duplicate submission - same name, gender, DOB, and email'
            });
          } catch (auditError) {
            logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
          }
          
          const errorMessage = existingResponseInfo 
            ? `You have already submitted a response for this survey. Your previous submission (${existingResponseInfo.response_id}) has status: ${existingResponseInfo.validation_status}. Cannot submit duplicate.`
            : `A profile with your name, date of birth, gender, and email already exists. You have already submitted a response for this survey. Cannot submit duplicate.`;
          
          return res.status(400).json({
            success: false,
            message: errorMessage,
            error: 'duplicate_name_email_match',
            details: {
              existing_youth_id: youth_id,
              existing_response: existingResponseInfo
            }
          });
        }
        
        // SCENARIO 3: Same full name (first, middle, last, suffix if any), gender, DOB, barangay but different contact AND email - ACCEPT AS PENDING
        // This could be:
        // - Same person with updated contact info (needs manual verification)
        // - Different person with same demographics (needs manual verification)
        // - Data entry error (needs manual review)
        // NOTE: Email must be different (if email matched, we would have rejected in SCENARIO 2)
        if (isNameMatch && !isContactMatch && !isEmailMatch) {
          logger.warn('Potential duplicate: Same full name (first, middle, last, suffix if any), gender, DOB, and barangay but different contact AND email', {
            existing: `${existing.contact_number} / ${existing.email}`,
            new: `${mappedPersonalData.contact_number} / ${mappedPersonalData.email}`
          });
          
          // Check if the new contact/email is already used by a DIFFERENT profile
          // This would indicate a conflict that needs special handling
          const conflictCheck = await client.query(`
            SELECT youth_id, first_name, last_name, contact_number, email
            FROM "Youth_Profiling"
            WHERE youth_id != $1
              AND (
                contact_number = $2
                OR email = $3
              )
          `, [youth_id, mappedPersonalData.contact_number, mappedPersonalData.email]);
          
          if (conflictCheck.rows.length > 0) {
            // New contact/email is already used by another profile - REJECT immediately
            // Cannot proceed because the new contact/email violates UNIQUE constraint
            logger.error('CRITICAL CONFLICT: New contact/email is already used by another profile', {
              conflictingProfile: `${conflictCheck.rows[0].youth_id} - ${conflictCheck.rows[0].first_name} ${conflictCheck.rows[0].last_name}`,
              existingProfile: `${youth_id} - ${existing.first_name} ${existing.last_name}`,
              newContact: mappedPersonalData.contact_number,
              newEmail: mappedPersonalData.email
            });
            
            await client.query('ROLLBACK');
            
            // Determine which field is conflicting
            const conflictingContact = conflictCheck.rows[0].contact_number === mappedPersonalData.contact_number;
            const conflictingEmail = conflictCheck.rows[0].email === mappedPersonalData.email;
            let conflictField = '';
            if (conflictingContact && conflictingEmail) {
              conflictField = 'contact number and email';
            } else if (conflictingContact) {
              conflictField = 'contact number';
            } else if (conflictingEmail) {
              conflictField = 'email';
            }
            
            // Create audit log for failed submission
            try {
              await createAuditLog({
                userId: 'anonymous',
                userType: 'youth',
                action: 'SUBMIT_SURVEY_FAILED',
                resource: '/api/survey-responses/create-and-submit',
                resourceId: null,
                resourceName: 'Survey Submission Failed - Contact/Email Conflict',
                resourceType: 'survey-response',
                category: 'Survey Management',
                details: {
                  error_type: 'contact_email_conflict',
                  conflict_field: conflictField,
                  existing_youth_id: youth_id,
                  existing_name: `${existing.first_name} ${existing.last_name}`,
                  conflicting_youth_id: conflictCheck.rows[0].youth_id,
                  conflicting_name: `${conflictCheck.rows[0].first_name} ${conflictCheck.rows[0].last_name}`,
                  new_contact: mappedPersonalData.contact_number,
                  new_email: mappedPersonalData.email
                },
                ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
                userAgent: req.get('User-Agent'),
                status: 'error',
                errorMessage: `The ${conflictField} you provided is already registered to another youth profile`
              });
            } catch (auditError) {
              logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
            }
            
            let userFacingMessage = 'It looks like these contact details are already tied to an existing survey submission. You may have already completed this survey. If you believe this is a mistake, please contact support so we can help.';
            if (conflictingContact && conflictingEmail) {
              userFacingMessage = 'The contact number or email you entered is already linked to another survey submission. You may have already answered this survey. If you need to make changes, please reach out to support.';
            } else if (conflictingContact) {
              userFacingMessage = 'The contact number you provided is already linked to an existing survey submission. You may have already answered this survey. If you need to update your details, please contact support.';
            } else if (conflictingEmail) {
              userFacingMessage = 'The email you provided is already linked to an existing survey submission. You may have already answered this survey. If you need help updating your information, please contact support.';
            }

            return res.status(400).json({
              success: false,
              message: userFacingMessage,
              error: 'contact_email_conflict',
              conflictField: conflictField
            });
          } else {
            // New contact/email is not in use - safe to update after verification
            req.duplicateCheckFlag = {
              type: 'same_name_different_contact',
              existing_contact: existing.contact_number,
              existing_email: existing.email,
              new_contact: mappedPersonalData.contact_number,
              new_email: mappedPersonalData.email,
              requires_manual_review: true,
              severity: 'medium' // Medium severity - likely same person
            };
            logger.info('Will flag for manual validation to determine if same person or different');
          }
        }
      }
    } else {
      // New youth - create profile and user account
      logger.debug('Creating new youth profile');
      
      // Generate unique IDs using the updated generators
      youth_id = await generateId('YTH');
      user_id = await generateId('USR');
      isNewYouth = true;

      // Create youth profile with retention date set to 5 years from now
      const youthQuery = `
        INSERT INTO "Youth_Profiling" (
          youth_id, first_name, last_name, middle_name, suffix,
          age, gender, contact_number, email, barangay_id, purok_zone, birth_date,
          last_activity_date, data_retention_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, (CURRENT_TIMESTAMP + INTERVAL '5 years')::DATE)
        RETURNING *;
      `;
      logger.debug('EMAIL DEBUG - Before inserting into Youth_Profiling', {
        email: mappedPersonalData.email,
        emailLength: mappedPersonalData.email ? mappedPersonalData.email.length : 0,
        emailType: typeof mappedPersonalData.email
      });
      
      await client.query(youthQuery, [
        youth_id, mappedPersonalData.first_name, mappedPersonalData.last_name, 
        mappedPersonalData.middle_name || null, mappedPersonalData.suffix || null,
        mappedPersonalData.age, mappedPersonalData.gender, mappedPersonalData.contact_number, 
        mappedPersonalData.email, mappedPersonalData.barangay_id, mappedPersonalData.purok_zone || null,
        mappedPersonalData.birth_date
      ]);
      
      // Verify email was stored correctly
      const verifyEmail = await client.query(`
        SELECT email FROM "Youth_Profiling" WHERE youth_id = $1
      `, [youth_id]);
      logger.debug('EMAIL DEBUG - After inserting, stored email', {
        storedEmail: verifyEmail.rows[0]?.email,
        storedEmailLength: verifyEmail.rows[0]?.email ? verifyEmail.rows[0].email.length : 0
      });

      // Create user account
      const userQuery = `
        INSERT INTO "Users" (
          user_id, youth_id, user_type
        ) VALUES ($1, $2, $3)
        RETURNING *;
      `;
      await client.query(userQuery, [user_id, youth_id, 'youth']);
      
      logger.info(`Created new youth profile: ${youth_id} and user: ${user_id}`);
    }

    // 3. Get active survey batch
    logger.debug('Getting active survey batch');
    const activeSurveyResult = await client.query(`
      SELECT batch_id, batch_name, description, status 
      FROM "KK_Survey_Batches" 
      WHERE status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (activeSurveyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No active survey batch found for submission'
      });
    }

    const batch_id = activeSurveyResult.rows[0].batch_id;
    const batch_name = activeSurveyResult.rows[0].batch_name;
    logger.info(`Found active survey batch: ${batch_id} (${batch_name})`);

    // 4. Check if youth already answered this batch
    logger.debug('Checking if youth already answered this batch', {
      youth_id,
      batch_id,
      contactMismatchFlag: req.duplicateCheckFlag ? JSON.stringify(req.duplicateCheckFlag, null, 2) : 'NONE'
    });
    
    const existingResponseCheck = await client.query(`
      SELECT response_id, validation_status FROM "KK_Survey_Responses"
      WHERE batch_id = $1 AND youth_id = $2
    `, [batch_id, youth_id]);

    logger.debug(`Existing responses found: ${existingResponseCheck.rows.length}`);

    if (existingResponseCheck.rows.length > 0) {
      // Check all existing responses to see if any are validated
      const validatedResponses = existingResponseCheck.rows.filter(r => r.validation_status === 'validated');
      const rejectedResponses = existingResponseCheck.rows.filter(r => r.validation_status === 'rejected');
      const pendingResponses = existingResponseCheck.rows.filter(r => r.validation_status === 'pending');
      
      logger.debug('Response status breakdown', {
        validated: validatedResponses.length,
        pending: pendingResponses.length,
        rejected: rejectedResponses.length
      });
      
      // Get the most recent response for reference
      const existingResponse = existingResponseCheck.rows[0];
      logger.debug(`Existing response: ${existingResponse.response_id}`, { status: existingResponse.validation_status });
      
      // Check if there's a contact mismatch (same name/DOB/barangay but different contact)
      const hasContactMismatch = req.duplicateCheckFlag && 
                                 (req.duplicateCheckFlag.type === 'same_name_different_contact' ||
                                  req.duplicateCheckFlag.type === 'same_name_different_contact_with_conflict');
      
      logger.debug(`Has contact mismatch flag: ${hasContactMismatch}`, {
        type: req.duplicateCheckFlag?.type || 'NONE',
        details: req.duplicateCheckFlag ? JSON.stringify(req.duplicateCheckFlag, null, 2) : 'NONE'
      });
      
      // If contact mismatch detected, allow submission but flag for manual validation
      // This handles cases where:
      // 1. Same person with updated contact info (legitimate update)
      // 2. Different person with same demographics (needs verification)
      // 3. Previous responses were rejected and this is a new submission with corrected info
      if (hasContactMismatch) {
        logger.warn('Duplicate response found, but contact mismatch detected', {
          existingResponses: existingResponseCheck.rows.length,
          message: 'Allowing submission with updated contact info - will be flagged for manual validation. This handles: same person with updated contact OR different person with same demographics'
        });
        // Continue with submission - will be flagged for manual validation with contact mismatch comment
        // Admin can then decide if it's the same person or different, and handle accordingly
      } else if (validatedResponses.length > 0) {
        // Has validated response(s) - reject (cannot override validated response)
        logger.warn('Validated response(s) found - cannot submit duplicate', {
          youth_id,
          batch_id,
          validatedCount: validatedResponses.length
        });
        await client.query('ROLLBACK');
        
        // Create audit log for failed submission (duplicate response)
        try {
          await createAuditLog({
            userId: 'anonymous',
            userType: 'youth',
            action: 'SUBMIT_SURVEY_FAILED',
            resource: '/api/survey-responses/create-and-submit',
            resourceId: validatedResponses[0].response_id,
            resourceName: 'Survey Submission Failed - Duplicate Response (Validated)',
            resourceType: 'survey-response',
            category: 'Survey Management',
            details: {
              error_type: 'duplicate_response_validated',
              batch_id: batch_id,
              existing_response_id: validatedResponses[0].response_id,
              youth_id: youth_id,
              validated_responses_count: validatedResponses.length
            },
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.get('User-Agent'),
            status: 'error',
            errorMessage: 'Duplicate response - validated response already exists for this batch'
          });
        } catch (auditError) {
          logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
        }
        
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a validated response for this survey batch. Cannot submit duplicate.',
          error: 'duplicate_response_validated',
          details: {
            existing_response_id: validatedResponses[0].response_id,
            batch_id: batch_id,
            youth_id: youth_id,
            validated_count: validatedResponses.length
          }
        });
      } else if (pendingResponses.length > 0 && !hasContactMismatch) {
        // Has pending response(s) but no contact mismatch - reject
        logger.warn('Pending response(s) found - NO contact mismatch flag', {
          youth_id,
          batch_id,
          pendingCount: pendingResponses.length
        });
        await client.query('ROLLBACK');
        
        // Create audit log for failed submission (duplicate response)
        try {
          await createAuditLog({
            userId: 'anonymous',
            userType: 'youth',
            action: 'SUBMIT_SURVEY_FAILED',
            resource: '/api/survey-responses/create-and-submit',
            resourceId: pendingResponses[0].response_id,
            resourceName: 'Survey Submission Failed - Duplicate Response (Pending)',
            resourceType: 'survey-response',
            category: 'Survey Management',
            details: {
              error_type: 'duplicate_response_pending',
              batch_id: batch_id,
              existing_response_id: pendingResponses[0].response_id,
              youth_id: youth_id,
              pending_responses_count: pendingResponses.length,
              contact_mismatch_flag: req.duplicateCheckFlag || null
            },
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.get('User-Agent'),
            status: 'error',
            errorMessage: 'Duplicate response for this survey batch'
          });
        } catch (auditError) {
          logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
        }
        
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a response for this survey batch that is pending validation.',
          error: 'duplicate_response_pending',
          details: {
            existing_response_id: pendingResponses[0].response_id,
            batch_id: batch_id,
            youth_id: youth_id
          }
        });
      } else if (rejectedResponses.length > 0 && !hasContactMismatch) {
        // All responses are rejected and no contact mismatch - allow new submission
        // This handles cases where previous submissions were rejected and user is resubmitting
        logger.info('All existing responses are rejected - allowing new submission', {
          rejectedCount: rejectedResponses.length,
          message: 'Allowing submission as new attempt after rejection'
        });
        // Continue with submission
      } else {
        // Fallback: reject if no special case applies
        logger.warn('Duplicate response found - no special handling case applies', {
          youth_id,
          batch_id
        });
        await client.query('ROLLBACK');
        
        // Create audit log for failed submission (duplicate response)
        try {
          await createAuditLog({
            userId: 'anonymous',
            userType: 'youth',
            action: 'SUBMIT_SURVEY_FAILED',
            resource: '/api/survey-responses/create-and-submit',
            resourceId: existingResponse.response_id,
            resourceName: 'Survey Submission Failed - Duplicate Response',
            resourceType: 'survey-response',
            category: 'Survey Management',
            details: {
              error_type: 'duplicate_response',
              batch_id: batch_id,
              existing_response_id: existingResponse.response_id,
              youth_id: youth_id,
              existing_status: existingResponse.validation_status,
              contact_mismatch_flag: req.duplicateCheckFlag || null,
              response_count: existingResponseCheck.rows.length
            },
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.get('User-Agent'),
            status: 'error',
            errorMessage: 'Duplicate response for this survey batch'
          });
        } catch (auditError) {
          logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
        }
        
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a response for this survey batch',
          error: 'duplicate_response',
          details: {
            existing_response_id: existingResponse.response_id,
            batch_id: batch_id,
            youth_id: youth_id,
            response_count: existingResponseCheck.rows.length
          }
        });
      }
    }

    // 5. Insert survey response with appropriate validation status
    logger.debug('Inserting survey response');
    // Generate response ID using the proper generator
    const response_id = await generateId('RES');
    
    // Generate secure access token for email tracking link (72 hour expiration)
    const tokenData = TokenGenerator.generateTokenWithExpiration(72);
    const tokenHash = TokenGenerator.hashToken(tokenData.token);
    
    // Set validation status based on youth profile validation status or voter match
    let validation_status;
    let validation_tier;
    let voter_match_type = 'none';
    let validation_score = 0;
    let shouldUpdateYouthProfile = false;
    
    // Check if we have a contact mismatch flag (same full name, gender, DOB, barangay but different contact)
    const hasContactMismatch = req.duplicateCheckFlag && 
                               (req.duplicateCheckFlag.type === 'same_name_different_contact' ||
                                req.duplicateCheckFlag.type === 'same_name_different_contact_with_conflict');
    
    if (existingYouthCheck.rows.length > 0) {
      // Existing youth - check their profile validation status
      const youthProfileStatus = existingYouthCheck.rows[0].validation_status;
      const youthProfileTier = existingYouthCheck.rows[0].validation_tier;
      
      // IMPORTANT: If contact info differs (same full name, gender, DOB, barangay but different email/contact),
      // ALWAYS require manual validation, even if youth profile is validated
      // This is to verify if it's the same person with updated contact info or a different person
      if (hasContactMismatch) {
        logger.warn('Contact info mismatch detected - requiring manual validation', {
          existing: `${req.duplicateCheckFlag.existing_contact} / ${req.duplicateCheckFlag.existing_email}`,
          new: `${req.duplicateCheckFlag.new_contact} / ${req.duplicateCheckFlag.new_email}`
        });
        validation_status = 'pending';
        validation_tier = 'manual';
        voter_match_type = 'contact_mismatch';
        validation_score = 50; // Lower score to flag for attention
        logger.info('Same full name (first, middle, last, suffix if any), gender, DOB, barangay but different contact - requires manual validation');
      } else if (youthProfileStatus === 'validated') {
        // Youth profile is already validated and contact matches - use that status
        validation_status = 'validated';
        validation_tier = youthProfileTier || 'automatic';
        voter_match_type = 'existing_youth';
        logger.info('Existing validated youth found - using profile validation status');
      } else {
        // Existing youth but not validated - treat as new and check voter match
        logger.debug('Existing youth found but not validated - checking voter match');
        const voterResult = await checkVoterMatch(mappedPersonalData, client);
        
        if (voterResult.error) {
          logger.error('Error in voter match validation, defaulting to manual review', { error: voterResult.error });
          validation_status = 'pending';
          validation_tier = 'manual';
          voter_match_type = 'none';
          validation_score = 0;
        } else if (voterResult.score === 100) {
          // Exact match - validate both response and youth profile
          validation_status = 'validated';
          validation_tier = 'automatic';
          voter_match_type = voterResult.matchType;
          validation_score = voterResult.score;
          shouldUpdateYouthProfile = true;
          logger.info(`Exact voter match (${voterResult.score}%) - auto-validating response and youth profile`);
        } else {
          // Partial match - manual review needed
          validation_status = 'pending';
          validation_tier = 'manual';
          voter_match_type = voterResult.matchType;
          validation_score = voterResult.score;
          logger.info(`Voter match score ${voterResult.score}% - requires manual validation`);
        }
      }
    } else {
      // New youth - check voters table for validation with scoring
      logger.debug('New youth - checking voter match with scoring');
      const voterResult = await checkVoterMatch(mappedPersonalData, client);
      
      if (voterResult.error) {
        logger.error('Error in voter match validation, defaulting to manual review', { error: voterResult.error });
        validation_status = 'pending';
        validation_tier = 'manual';
        voter_match_type = 'none';
        validation_score = 0;
      } else if (voterResult.score === 100) {
        // Only exact matches auto-validate
        validation_status = 'validated';
        validation_tier = 'automatic';
        voter_match_type = voterResult.matchType;
        validation_score = voterResult.score;
        shouldUpdateYouthProfile = true;
        logger.info(`Exact voter match (${voterResult.score}%) - auto-validating response and youth profile`);
      } else {
        // Any match below 100% goes to manual review
        validation_status = 'pending';
        validation_tier = 'manual';
        voter_match_type = voterResult.matchType;
        validation_score = voterResult.score;
        logger.info(`Voter match score ${voterResult.score}% - requires manual validation`);
      }
    }
    
    logger.debug('Final validation settings', {
      validation_status,
      validation_tier,
      voter_match_type,
      validation_score
    });

    // Map survey data to database columns
    const demographics = survey_data.demographics || {};
    const civic = survey_data.civic || {};
    
    // Calculate youth age group based on age
    const age = parseInt(mappedPersonalData.age);
    let youthAgeGroup;
    if (age >= 15 && age <= 17) {
      youthAgeGroup = 'Child Youth (15-17 yrs old)';
    } else if (age >= 18 && age <= 24) {
      youthAgeGroup = 'Core Youth (18-24 yrs old)';
    } else if (age >= 25 && age <= 30) {
      youthAgeGroup = 'Young Adult (15-30 yrs old)';
    } else {
      youthAgeGroup = 'Young Adult (15-30 yrs old)'; // Default fallback
    }
    
    logger.debug('Survey data mapping', {
      demographics: demographics,
      civic: civic,
      calculatedAge: age,
      youthAgeGroup: youthAgeGroup
    });

    const insertResponseQuery = `
      INSERT INTO "KK_Survey_Responses" (
        response_id, batch_id, youth_id, barangay_id, 
        civil_status, youth_classification, youth_specific_needs, youth_age_group,
        educational_background, work_status,
        registered_SK_voter, registered_national_voter, attended_KK_assembly,
        voted_last_SK, times_attended, reason_not_attended,
        validation_status, validation_tier, data_retention_date,
        access_token_hash, access_token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, (CURRENT_TIMESTAMP + INTERVAL '5 years')::DATE, $19, $20)
      RETURNING *;
    `;
    
    const responseResult = await client.query(insertResponseQuery, [
      response_id, batch_id, youth_id, mappedPersonalData.barangay_id,
      demographics.civilStatus || null,
      demographics.youthClassification || 'In School Youth',
      demographics.youthClassificationSpecific || null,
      youthAgeGroup, // Use calculated age group instead of form data
      demographics.educationalBackground || null,
      demographics.workStatus || null,
      civic.registeredSKVoter === 'Yes' ? true : (civic.registeredSKVoter === 'No' ? false : null),
      civic.registeredNationalVoter === 'Yes' ? true : (civic.registeredNationalVoter === 'No' ? false : null),
      civic.attendedKKAssembly === 'Yes' ? true : (civic.attendedKKAssembly === 'No' ? false : null),
      civic.votedLastSKElection === 'Yes' ? true : (civic.votedLastSKElection === 'No' ? false : null),
      civic.kkAssemblyTimes || null,
      civic.notAttendedReason || null,
      validation_status, validation_tier,
      tokenHash, // Store hashed token for verification
      tokenData.expiresAt // Token expiration
    ]);

    logger.info(`Created survey response: ${response_id} with validation_status: ${validation_status}`);

    // Update youth profile validation status if needed
    if (shouldUpdateYouthProfile && validation_status === 'validated') {
      logger.debug('Updating youth profile validation status');
      await client.query(`
        UPDATE "Youth_Profiling"
        SET 
          validation_status = $1,
          validation_tier = $2,
          validated_by = NULL,
          validation_date = (NOW() AT TIME ZONE 'Asia/Manila')
        WHERE youth_id = $3
      `, [validation_status, validation_tier, youth_id]);
      logger.info(`Updated youth profile ${youth_id} validation status to 'validated'`);
    }

    // If validation is pending, create a validation queue entry
    if (validation_status === 'pending') {
      logger.debug('Creating validation queue entry for manual review');
      
      const queue_id = await generateId('QUE');
      
      // Add validation comment if contact mismatch detected
      let validationComment = null;
      if (hasContactMismatch) {
        if (req.duplicateCheckFlag.type === 'same_name_different_contact_with_conflict') {
          // High severity - contact info conflict with another profile
          validationComment = `🚨 HIGH PRIORITY - CONTACT CONFLICT: Same full name (first, middle, last, suffix if any), gender, DOB, and barangay but different contact info. ` +
            `The new contact info (${req.duplicateCheckFlag.new_contact} / ${req.duplicateCheckFlag.new_email}) is already used by another profile: ` +
            `${req.duplicateCheckFlag.conflicting_name} (${req.duplicateCheckFlag.conflicting_youth_id}). ` +
            `Existing profile: ${req.duplicateCheckFlag.existing_contact} / ${req.duplicateCheckFlag.existing_email}. ` +
            `Please verify identity and resolve conflict - may need to create new profile or update existing one.`;
        } else {
          // Medium severity - likely same person with updated contact
          // Ensure emails are properly included in validation comment
          const existingEmail = req.duplicateCheckFlag.existing_email || 'N/A';
          const newEmail = req.duplicateCheckFlag.new_email || 'N/A';
          logger.debug('EMAIL DEBUG - Creating validation comment', {
            existingEmail,
            existingEmailLength: existingEmail.length,
            newEmail,
            newEmailLength: newEmail.length
          });
          validationComment = `⚠️ POTENTIAL DUPLICATE: Same full name (first, middle, last, suffix if any), gender, DOB, and barangay but different contact info. ` +
            `Existing: ${req.duplicateCheckFlag.existing_contact} / ${existingEmail}. ` +
            `New: ${req.duplicateCheckFlag.new_contact} / ${newEmail}. ` +
            `Please verify if this is the same person with updated contact info or a different person with same demographics.`;
        }
        logger.debug(`Added validation comment for contact mismatch: ${validationComment.substring(0, 100)}...`);
      }
      
      const insertQueueQuery = `
        INSERT INTO "Validation_Queue" (
          queue_id, response_id, youth_id, voter_match_type, validation_score
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      
      const queueResult = await client.query(insertQueueQuery, [
        queue_id,
        response_id,
        youth_id,
        voter_match_type,
        validation_score
      ]);
      
      logger.info(`Created validation queue entry: ${queue_id} with score: ${validation_score}%`);
      
      // Store validation comment in response for admin review
      if (validationComment) {
        try {
          await client.query(`
            UPDATE "KK_Survey_Responses"
            SET validation_comments = $1
            WHERE response_id = $2
          `, [validationComment, response_id]);
          logger.info(`Added validation comment to response: ${response_id}`);
        } catch (commentError) {
          logger.warn('Could not add validation comment (column may not exist)', { error: commentError.message });
          // Don't fail the transaction if comment column doesn't exist or update fails
        }
      }
    }

    await client.query('COMMIT');

    // Always update last activity date and retention date for data retention
    // Also record consent if provided
    try {
      // Always update last activity date and retention date (required for compliance)
      if (youth_id) {
        await dataRetentionService.updateLastActivityDate(youth_id);
        logger.info(`Updated activity date and retention date for youth: ${youth_id}`);
      }

      // Record consent for data processing (if consent information is provided)
      // This is optional - activity/retention tracking happens regardless
      const consentData = req.body.consent || req.body.acceptedSections;
      if (consentData && (consentData.dataUse || consentData.privacy || consentData.terms)) {
        await consentService.recordConsent({
          youthId: youth_id,
          email: mappedPersonalData.email,
          consentType: 'data_processing',
          consentStatus: 'granted',
          consentMethod: 'online_form',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          consentText: 'Data processing consent for survey participation',
          version: '1.0',
        });
        logger.info(`Consent recorded for youth: ${youth_id}`);
      } else {
        logger.info(`No consent data provided for youth: ${youth_id} (activity/retention still tracked)`);
      }
    } catch (consentError) {
      // Don't fail the request if consent logging fails
      logger.error('Failed to record consent or update activity date', { error: consentError.message, stack: consentError.stack });
    }

    // Send email notification to youth (async, don't block response)
    if (mappedPersonalData.email) {
      setTimeout(async () => {
        try {
          const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
          const trackingUrl = `${baseUrl}/survey-submission/status?token=${tokenData.token}`;
          
          let templateName;
          let emailData;
          
          // Get the actual submission timestamp from the response
          const submissionTimestamp = new Date().toISOString(); // Use current time as submission time
          
          // Construct full name from mappedPersonalData (which uses snake_case)
          const firstName = mappedPersonalData.first_name || mappedPersonalData.firstName || '';
          const middleName = mappedPersonalData.middle_name || mappedPersonalData.middleName || '';
          const lastName = mappedPersonalData.last_name || mappedPersonalData.lastName || '';
          const suffix = mappedPersonalData.suffix || '';
          const fullName = firstName && lastName
            ? `${firstName}${middleName ? ' ' + middleName : ''}${lastName ? ' ' + lastName : ''}${suffix ? ' ' + suffix : ''}`.trim()
            : firstName || '';
          
          if (validation_status === 'validated') {
            templateName = 'surveyValidated';
            emailData = {
              userName: fullName || '-',
              email: mappedPersonalData.email || null,
              batchName: batch_name,
              validationDate: new Date().toISOString(),
              validationTier: validation_tier,
              trackingUrl: trackingUrl, // Add tracking link
              responseId: response_id,
              youthId: youth_id, // Add Youth ID
              submittedAt: submissionTimestamp, // Use actual submission timestamp
              frontendUrl: baseUrl // Add frontend URL for DSR links
            };
          } else {
            templateName = 'surveyPending';
            emailData = {
              userName: fullName || '-',
              email: mappedPersonalData.email || null,
              batchName: batch_name,
              submissionDate: submissionTimestamp,
              trackingUrl: trackingUrl, // Add tracking link
              responseId: response_id,
              youthId: youth_id, // Add Youth ID
              submittedAt: submissionTimestamp, // Use actual submission timestamp
              frontendUrl: baseUrl // Add frontend URL for DSR links
            };
          }
          
          await emailService.sendTemplatedEmail(
            templateName,
            emailData,
            mappedPersonalData.email
          );
          logger.info(`${validation_status === 'validated' ? 'Validation' : 'Submission'} email sent to ${mappedPersonalData.email} with tracking link`);
        } catch (emailError) {
          logger.error(`Failed to send submission email to ${mappedPersonalData.email}`, { error: emailError.message, stack: emailError.stack });
          // Don't fail the request if email fails
        }
      }, 100); // Small delay to ensure response is sent first
    } else {
      logger.info('No email address provided, skipping email notification');
    }

    // Generate appropriate success message
    let successMessage;
    if (validation_status === 'validated') {
      if (voter_match_type === 'existing_youth') {
        successMessage = 'Survey submitted successfully. Response has been automatically validated (existing youth).';
      } else if (voter_match_type === 'exact') {
        successMessage = 'Survey submitted successfully. Response has been automatically validated (exact voter match).';
      } else {
        successMessage = 'Survey submitted successfully. Response has been automatically validated.';
      }
    } else {
      if (voter_match_type === 'none') {
        successMessage = 'New youth profile created and survey submitted successfully. Response is pending validation (no voter match).';
      } else {
        successMessage = `New youth profile created and survey submitted successfully. Response is pending validation (voter match: ${validation_score}% - requires manual review).`;
      }
    }

    // Create audit log for successful survey submission
    try {
      await createAuditLog({
        userId: 'anonymous', // Survey submissions are anonymous
        userType: 'youth',
        action: 'SUBMIT_SURVEY',
        resource: '/api/survey-responses/create-and-submit',
        resourceId: response_id,
        resourceName: `Survey Response ${response_id}`,
        resourceType: 'survey-response',
        category: 'Survey Management',
        details: {
          batch_id: batch_id,
          youth_id: youth_id,
          validation_status: validation_status,
          validation_tier: validation_tier,
          voter_match_type: voter_match_type,
          validation_score: validation_score,
          isNewYouth: isNewYouth,
          // Masked sensitive data
          email: maskEmail(mappedPersonalData.email),
          contact_number: maskContact(mappedPersonalData.contact_number),
          birth_date_year: extractBirthYear(mappedPersonalData.birth_date)
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      logger.info(`Survey submission audit log created: ${response_id}`);
    } catch (auditError) {
      logger.error('Failed to create survey submission audit log', { error: auditError.message, stack: auditError.stack });
      // Don't fail the request if audit logging fails
    }

    return res.status(201).json({
      success: true,
      message: successMessage,
      data: {
        youth_id,
        user_id,
        response_id,
        isNewYouth,
        validation_status,
        accessToken: tokenData.token, // Include token for immediate redirect
        validation_tier,
        voter_match_type,
        validation_score,
        submitted_at: responseResult.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createProfileAndSubmitSurvey', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    // Check if this is a UNIQUE constraint violation
    const isUniqueConstraintViolation = error.code === '23505'; // PostgreSQL unique violation
    let errorType = 'server_error';
    let errorMessage = 'Internal server error during survey submission';
    let userMessage = 'Internal server error during survey submission';
    let statusCode = 500;
    
    if (isUniqueConstraintViolation) {
      errorType = 'unique_constraint_violation';
      statusCode = 400; // Bad request, not server error
      
      // Parse which field caused the violation
      let conflictingField = 'contact information';
      if (error.constraint) {
        if (error.constraint.includes('contact_number') || error.constraint.includes('contact')) {
          conflictingField = 'contact number';
        } else if (error.constraint.includes('email')) {
          conflictingField = 'email';
        }
      } else if (error.column) {
        if (error.column === 'contact_number') {
          conflictingField = 'contact number';
        } else if (error.column === 'email') {
          conflictingField = 'email';
        }
      }
      
      userMessage = `A profile with this ${conflictingField} already exists. Please use a different ${conflictingField} or contact support if you believe this is an error.`;
      errorMessage = `Unique constraint violation: ${conflictingField} already exists`;
      
      logger.error(`UNIQUE CONSTRAINT VIOLATION: ${conflictingField} is already in use`, {
        constraint: error.constraint || 'unknown',
        table: error.table || 'unknown',
        column: error.column || 'unknown',
        detail: error.detail || 'no details'
      });
    }
    
    // Create audit log for failed submission
    try {
      await createAuditLog({
        userId: 'anonymous',
        userType: 'youth',
        action: 'SUBMIT_SURVEY_FAILED',
        resource: '/api/survey-responses/create-and-submit',
        resourceId: null,
        resourceName: `Survey Submission Failed - ${errorType === 'unique_constraint_violation' ? 'Duplicate Contact/Email' : 'Server Error'}`,
        resourceType: 'survey-response',
        category: 'Survey Management',
        details: {
          error_type: errorType,
          error_code: error.code || null,
          error_constraint: error.constraint || null,
          error_table: error.table || null,
          error_column: error.column || null,
          error_detail: error.detail || null,
          submitted_email: mappedPersonalData?.email || null,
          submitted_contact: mappedPersonalData?.contact_number || null
        },
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.get('User-Agent'),
        status: 'error',
        errorMessage: errorMessage
      });
    } catch (auditError) {
      logger.error('Failed to create failed submission audit log', { error: auditError.message, stack: auditError.stack });
    }
    
    res.status(statusCode).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : (isUniqueConstraintViolation ? userMessage : undefined),
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        constraint: error.constraint,
        table: error.table,
        column: error.column
      } : (isUniqueConstraintViolation ? {
        error_type: 'duplicate_contact',
        field: error.column || 'contact information'
      } : undefined)
    });
  } finally {
    client.release();
  }
};

export {
  createProfileAndSubmitSurvey
};