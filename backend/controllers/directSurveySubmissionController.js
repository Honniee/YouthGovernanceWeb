import db, { getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import { validateYouthProfile } from '../utils/validation.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import { maskEmail, maskContact, extractBirthYear } from '../utils/dataMasking.js';

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
    
    console.log('🔍 Checking voter match with flexible matching (including middle name and suffix):', {
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
      console.log('✅ Exact voter match found');
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
      console.log('✅ Flexible name match found');
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
      console.log('✅ Name + birth date flexible match found');
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
      console.log('✅ Name + gender flexible match found');
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
      console.log('✅ Very flexible name match found');
      return {
        hasMatch: true,
        voter_id: veryFlexibleMatch.rows[0].voter_id,
        matchType: 'partial',
        score: 75,
        details: 'Match with major name variations and birth date'
      };
    }
    
    // No match found
    console.log('❌ No voter match found');
    return {
      hasMatch: false,
      voter_id: null,
      matchType: 'none',
      score: 0,
      details: 'No matching voter record found'
    };
    
  } catch (error) {
    console.error('❌ Error checking voter match:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
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
    
    // 🔍 DEBUG: Log the incoming data
    console.log('🔍 Incoming request data:', {
      personal_data: personal_data,
      survey_data_keys: Object.keys(survey_data || {}),
      recaptchaToken: recaptchaToken ? 'Present' : 'Missing'
    });
    
    // 🔍 DEBUG: Test database connection
    console.log('🔍 Testing database connection...');
    const testQuery = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', testQuery.rows[0]);

    // 1. Map frontend field names to backend field names
    const mappedPersonalData = {
      first_name: personal_data.firstName,
      last_name: personal_data.lastName,
      middle_name: personal_data.middleName,
      suffix: personal_data.suffix,
      age: personal_data.age,
      gender: personal_data.sexAtBirth === 'Other' ? 'Male' : personal_data.sexAtBirth,
      contact_number: personal_data.contactNumber,
      email: personal_data.email,
      barangay_id: personal_data.barangay,
      purok_zone: personal_data.purok,
      birth_date: personal_data.birthday
    };

    console.log('🔍 Mapped personal data for validation:', {
      first_name: mappedPersonalData.first_name,
      last_name: mappedPersonalData.last_name,
      birth_date: mappedPersonalData.birth_date,
      gender: mappedPersonalData.gender,
      birth_date_type: typeof mappedPersonalData.birth_date
    });

    console.log('🔍 Mapped personal data:', mappedPersonalData);

    // 2. Check if youth profile already exists by name + gender + birth_date OR by contact/email
    console.log('🔍 Checking if youth profile exists...');
    const existingYouthCheck = await client.query(`
      SELECT yp.youth_id, u.user_id, yp.validation_status, yp.validation_tier
      FROM "Youth_Profiling" yp
      LEFT JOIN "Users" u ON yp.youth_id = u.youth_id
      WHERE (
        -- Check by name + gender + birth_date (exact match)
        (yp.first_name = $1 
         AND yp.last_name = $2 
         AND yp.gender = $3 
         AND yp.birth_date = $4
         AND (yp.middle_name = $5 OR (yp.middle_name IS NULL AND $5 IS NULL))
         AND (yp.suffix = $6 OR (yp.suffix IS NULL AND $6 IS NULL)))
        OR
        -- Check by contact number (unique constraint)
        yp.contact_number = $7
        OR
        -- Check by email (unique constraint)
        yp.email = $8
      )
    `, [
      mappedPersonalData.first_name,
      mappedPersonalData.last_name, 
      mappedPersonalData.gender,
      mappedPersonalData.birth_date,
      mappedPersonalData.middle_name || null,
      mappedPersonalData.suffix || null,
      mappedPersonalData.contact_number,
      mappedPersonalData.email
    ]);

    let youth_id;
    let user_id;
    let isNewYouth = false;

    if (existingYouthCheck.rows.length > 0) {
      // Youth profile exists - use existing IDs
      youth_id = existingYouthCheck.rows[0].youth_id;
      user_id = existingYouthCheck.rows[0].user_id;
      console.log(`✅ Found existing youth profile: ${youth_id}`);
      
      // Check if this is a duplicate submission attempt with different details
      const existingProfile = await client.query(`
        SELECT first_name, last_name, middle_name, suffix, contact_number, email 
        FROM "Youth_Profiling" 
        WHERE youth_id = $1
      `, [youth_id]);
      
      if (existingProfile.rows.length > 0) {
        const existing = existingProfile.rows[0];
        const isContactMatch = existing.contact_number === mappedPersonalData.contact_number;
        const isEmailMatch = existing.email === mappedPersonalData.email;
        const isNameMatch = existing.first_name === mappedPersonalData.first_name && 
                           existing.last_name === mappedPersonalData.last_name;
        
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
            console.error('❌ Failed to create failed submission audit log:', auditError);
          }
          
          return res.status(400).json({
            success: false,
            message: `A profile with this ${conflictField} already exists with different youth information. Please use the correct details or contact support.`,
            error: 'duplicate_contact_with_different_details',
            conflictField: conflictField
          });
        }
      }
    } else {
      // New youth - create profile and user account
      console.log('🔍 Creating new youth profile...');
      
      // Generate unique IDs using the updated generators
      youth_id = await generateId('YTH');
      user_id = await generateId('USR');
      isNewYouth = true;

      // Create youth profile
      const youthQuery = `
        INSERT INTO "Youth_Profiling" (
          youth_id, first_name, last_name, middle_name, suffix,
          age, gender, contact_number, email, barangay_id, purok_zone, birth_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      await client.query(youthQuery, [
        youth_id, mappedPersonalData.first_name, mappedPersonalData.last_name, 
        mappedPersonalData.middle_name || null, mappedPersonalData.suffix || null,
        mappedPersonalData.age, mappedPersonalData.gender, mappedPersonalData.contact_number, 
        mappedPersonalData.email, mappedPersonalData.barangay_id, mappedPersonalData.purok_zone || null,
        mappedPersonalData.birth_date
      ]);

      // Create user account
      const userQuery = `
        INSERT INTO "Users" (
          user_id, youth_id, user_type
        ) VALUES ($1, $2, $3)
        RETURNING *;
      `;
      await client.query(userQuery, [user_id, youth_id, 'youth']);
      
      console.log(`✅ Created new youth profile: ${youth_id} and user: ${user_id}`);
    }

    // 3. Get active survey batch
    console.log('🔍 Getting active survey batch...');
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
    console.log(`✅ Found active survey batch: ${batch_id}`);

    // 4. Check if youth already answered this batch
    console.log('🔍 Checking if youth already answered this batch...');
    const existingResponseCheck = await client.query(`
      SELECT response_id FROM "KK_Survey_Responses"
      WHERE batch_id = $1 AND youth_id = $2
    `, [batch_id, youth_id]);

    if (existingResponseCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      
      // Create audit log for failed submission (duplicate response)
      try {
        await createAuditLog({
          userId: 'anonymous',
          userType: 'youth',
          action: 'SUBMIT_SURVEY_FAILED',
          resource: '/api/survey-responses/create-and-submit',
          resourceId: existingResponseCheck.rows[0].response_id,
          resourceName: 'Survey Submission Failed - Duplicate Response',
          resourceType: 'survey-response',
          category: 'Survey Management',
          details: {
            error_type: 'duplicate_response',
            batch_id: batch_id,
            existing_response_id: existingResponseCheck.rows[0].response_id,
            youth_id: youth_id
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          status: 'error',
          errorMessage: 'Duplicate response for this survey batch'
        });
      } catch (auditError) {
        console.error('❌ Failed to create failed submission audit log:', auditError);
      }
      
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a response for this survey batch'
      });
    }

    // 5. Insert survey response with appropriate validation status
    console.log('🔍 Inserting survey response...');
    // Generate response ID using the proper generator
    const response_id = await generateId('RES');
    
    // Set validation status based on youth profile validation status or voter match
    let validation_status;
    let validation_tier;
    let voter_match_type = 'none';
    let validation_score = 0;
    let shouldUpdateYouthProfile = false;
    
    if (existingYouthCheck.rows.length > 0) {
      // Existing youth - check their profile validation status
      const youthProfileStatus = existingYouthCheck.rows[0].validation_status;
      const youthProfileTier = existingYouthCheck.rows[0].validation_tier;
      
      if (youthProfileStatus === 'validated') {
        // Youth profile is already validated - use that status
        validation_status = 'validated';
        validation_tier = youthProfileTier || 'automatic';
        voter_match_type = 'existing_youth';
        console.log(`✅ Existing validated youth found - using profile validation status`);
      } else {
        // Existing youth but not validated - treat as new and check voter match
        console.log(`🔍 Existing youth found but not validated - checking voter match...`);
        const voterResult = await checkVoterMatch(mappedPersonalData, client);
        
        if (voterResult.error) {
          console.error('❌ Error in voter match validation, defaulting to manual review:', voterResult.error);
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
          console.log(`✅ Exact voter match (${voterResult.score}%) - auto-validating response and youth profile`);
        } else {
          // Partial match - manual review needed
          validation_status = 'pending';
          validation_tier = 'manual';
          voter_match_type = voterResult.matchType;
          validation_score = voterResult.score;
          console.log(`⏳ Voter match score ${voterResult.score}% - requires manual validation`);
        }
      }
    } else {
      // New youth - check voters table for validation with scoring
      console.log('🔍 New youth - checking voter match with scoring...');
      const voterResult = await checkVoterMatch(mappedPersonalData, client);
      
      if (voterResult.error) {
        console.error('❌ Error in voter match validation, defaulting to manual review:', voterResult.error);
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
        console.log(`✅ Exact voter match (${voterResult.score}%) - auto-validating response and youth profile`);
      } else {
        // Any match below 100% goes to manual review
        validation_status = 'pending';
        validation_tier = 'manual';
        voter_match_type = voterResult.matchType;
        validation_score = voterResult.score;
        console.log(`⏳ Voter match score ${voterResult.score}% - requires manual validation`);
      }
    }
    
    console.log(`🔍 Final validation settings:`, {
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
    
    console.log('🔍 Survey data mapping:', {
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
        validation_status, validation_tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
      validation_status, validation_tier
    ]);

    console.log(`✅ Created survey response: ${response_id} with validation_status: ${validation_status}`);

    // Update youth profile validation status if needed
    if (shouldUpdateYouthProfile && validation_status === 'validated') {
      console.log('🔍 Updating youth profile validation status...');
      await client.query(`
        UPDATE "Youth_Profiling"
        SET 
          validation_status = $1,
          validation_tier = $2,
          validation_date = (NOW() AT TIME ZONE 'Asia/Manila')
        WHERE youth_id = $3
      `, [validation_status, validation_tier, youth_id]);
      console.log(`✅ Updated youth profile ${youth_id} validation status to 'validated'`);
    }

    // If validation is pending, create a validation queue entry
    if (validation_status === 'pending') {
      console.log('🔍 Creating validation queue entry for manual review...');
      
      const queue_id = await generateId('QUE');
      
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
      
      console.log(`✅ Created validation queue entry: ${queue_id} with score: ${validation_score}%`);
    }

    await client.query('COMMIT');

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
      console.log(`✅ Survey submission audit log created: ${response_id}`);
    } catch (auditError) {
      console.error('❌ Failed to create survey submission audit log:', auditError);
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
        validation_tier,
        voter_match_type,
        validation_score,
        submitted_at: responseResult.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in createProfileAndSubmitSurvey:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    
    // Create audit log for failed submission (server error)
    try {
      await createAuditLog({
        userId: 'anonymous',
        userType: 'youth',
        action: 'SUBMIT_SURVEY_FAILED',
        resource: '/api/survey-responses/create-and-submit',
        resourceId: null,
        resourceName: 'Survey Submission Failed - Server Error',
        resourceType: 'survey-response',
        category: 'Survey Management',
        details: {
          error_type: 'server_error',
          error_code: error.code || null,
          // Don't log full error message to avoid exposing sensitive data
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'error',
        errorMessage: 'Internal server error during survey submission'
      });
    } catch (auditError) {
      console.error('❌ Failed to create failed submission audit log:', auditError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during survey submission',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail,
        hint: error.hint
      } : undefined
    });
  } finally {
    client.release();
  }
};

export {
  createProfileAndSubmitSurvey
};