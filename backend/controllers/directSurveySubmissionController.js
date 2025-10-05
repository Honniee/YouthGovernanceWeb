import db, { getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import { validateYouthProfile } from '../utils/validation.js';

/**
 * Direct Survey Submission Controller
 * Handles direct submission of survey data with proper business logic
 */

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

    console.log('🔍 Mapped personal data:', mappedPersonalData);

    // 2. Check if youth profile already exists by name + gender + birth_date OR by contact/email
    console.log('🔍 Checking if youth profile exists...');
    const existingYouthCheck = await client.query(`
      SELECT yp.youth_id, u.user_id 
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
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a response for this survey batch'
      });
    }

    // 5. Insert survey response with appropriate validation status
    console.log('🔍 Inserting survey response...');
    // Generate response ID manually since RES prefix is not in idGenerator
    const response_id = `RES${Date.now().toString().slice(-6)}`;
    
    // Set validation status based on whether youth is new or existing
    const validation_status = isNewYouth ? 'pending' : 'validated';
    const validation_tier = isNewYouth ? 'manual' : 'automatic';
    
    console.log(`🔍 Validation settings - Status: ${validation_status}, Tier: ${validation_tier}`);

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

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: isNewYouth 
        ? 'New youth profile created and survey submitted successfully. Response is pending validation.'
        : 'Survey submitted successfully. Response has been automatically validated.',
      data: {
        youth_id,
        user_id,
        response_id,
        isNewYouth,
        validation_status,
        validation_tier,
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