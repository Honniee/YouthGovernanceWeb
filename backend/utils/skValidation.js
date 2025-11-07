import { query } from '../config/database.js';
import { sanitizeInput, isValidEmail, isValidPhone } from './validation.js';

/**
 * SK-specific validation functions
 * Similar to staff validation but with SK-specific requirements
 */

// Valid SK positions from database schema
const VALID_SK_POSITIONS = [
  'SK Chairperson',
  'SK Secretary', 
  'SK Treasurer',
  'SK Councilor'
];

// Valid genders for SK officials profiling
const VALID_GENDERS = ['Male', 'Female'];

/**
 * Validates SK official creation data
 * @param {Object} data - SK official data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Validation result with isValid and errors array
 */
export const validateSKCreation = (data, isUpdate = false) => {
  const errors = [];
  const sanitizedData = sanitizeInput(data);

  try {
    // Required fields for creation
    if (!isUpdate) {
      if (!sanitizedData.firstName || sanitizedData.firstName.trim().length === 0) {
        errors.push('First name is required');
      }
      
      if (!sanitizedData.lastName || sanitizedData.lastName.trim().length === 0) {
        errors.push('Last name is required');
      }
      
      if (!sanitizedData.personalEmail || sanitizedData.personalEmail.trim().length === 0) {
        errors.push('Personal email is required');
      }
      
      if (!sanitizedData.position) {
        errors.push('Position is required');
      }
      
      if (!sanitizedData.barangayId) {
        errors.push('Barangay assignment is required');
      }
    }

    // Validate names (if provided)
    if (sanitizedData.firstName) {
      if (sanitizedData.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
      }
      if (sanitizedData.firstName.trim().length > 50) {
        errors.push('First name must be less than 50 characters');
      }
      if (!/^[a-zA-Z\s\-\.']+$/.test(sanitizedData.firstName.trim())) {
        errors.push('First name contains invalid characters');
      }
    }

    if (sanitizedData.lastName) {
      if (sanitizedData.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
      }
      if (sanitizedData.lastName.trim().length > 50) {
        errors.push('Last name must be less than 50 characters');
      }
      if (!/^[a-zA-Z\s\-\.']+$/.test(sanitizedData.lastName.trim())) {
        errors.push('Last name contains invalid characters');
      }
    }

    if (sanitizedData.middleName && sanitizedData.middleName.trim().length > 0) {
      if (sanitizedData.middleName.trim().length > 50) {
        errors.push('Middle name must be less than 50 characters');
      }
      if (!/^[a-zA-Z\s\-\.']+$/.test(sanitizedData.middleName.trim())) {
        errors.push('Middle name contains invalid characters');
      }
    }

    if (sanitizedData.suffix && sanitizedData.suffix.trim().length > 0) {
      if (sanitizedData.suffix.trim().length > 10) {
        errors.push('Suffix must be less than 10 characters');
      }
      if (!/^[a-zA-Z\s\-\.']+$/.test(sanitizedData.suffix.trim())) {
        errors.push('Suffix contains invalid characters');
      }
    }

    // Validate personal email
    if (sanitizedData.personalEmail) {
      if (!isValidEmail(sanitizedData.personalEmail)) {
        errors.push('Personal email format is invalid');
      }
      if (sanitizedData.personalEmail.length > 100) {
        errors.push('Personal email must be less than 100 characters');
      }
    }

    // Validate position
    if (sanitizedData.position) {
      if (!VALID_SK_POSITIONS.includes(sanitizedData.position)) {
        errors.push(`Position must be one of: ${VALID_SK_POSITIONS.join(', ')}`);
      }
    }

    // Validate barangay ID format
    if (sanitizedData.barangayId) {
      if (!/^SJB\d{3}$/.test(sanitizedData.barangayId)) {
        errors.push('Barangay ID must be in format SJB001, SJB002, etc.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };

  } catch (error) {
    console.error('❌ Error in SK validation:', error);
    return {
      isValid: false,
      errors: ['Validation failed due to internal error'],
      sanitizedData: null
    };
  }
};

/**
 * Validates SK official profiling data
 * @param {Object} data - Profiling data to validate
 * @returns {Object} Validation result
 */
export const validateSKProfiling = (data) => {
  const errors = [];
  const sanitizedData = sanitizeInput(data);

  try {
    // Birth date validation
    if (sanitizedData.birthDate) {
      const birthDate = new Date(sanitizedData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (isNaN(birthDate.getTime())) {
        errors.push('Birth date is invalid');
      } else {
        if (age < 15 || age > 30) {
          errors.push('SK official must be between 15 and 30 years old');
        }
      }
    }

    // Age validation (if provided separately)
    if (sanitizedData.age !== undefined) {
      const age = parseInt(sanitizedData.age);
      if (isNaN(age) || age < 15 || age > 30) {
        errors.push('Age must be between 15 and 30 years');
      }
    }

    // Gender validation
    if (sanitizedData.gender) {
      if (!VALID_GENDERS.includes(sanitizedData.gender)) {
        errors.push(`Gender must be one of: ${VALID_GENDERS.join(', ')}`);
      }
    }

    // Contact number validation
    if (sanitizedData.contactNumber) {
      if (!isValidPhone(sanitizedData.contactNumber)) {
        errors.push('Contact number format is invalid (use Philippine format: +639XXXXXXXXX)');
      }
    }

    // School or company validation
    if (sanitizedData.schoolOrCompany) {
      if (sanitizedData.schoolOrCompany.trim().length < 2) {
        errors.push('School/Company name must be at least 2 characters');
      }
      if (sanitizedData.schoolOrCompany.trim().length > 100) {
        errors.push('School/Company name must be less than 100 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };

  } catch (error) {
    console.error('❌ Error in SK profiling validation:', error);
    return {
      isValid: false,
      errors: ['Profiling validation failed due to internal error'],
      sanitizedData: null
    };
  }
};

/**
 * Validates SK term creation/update data with comprehensive data integrity checks
 * @param {Object} data - Term data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @param {Object} client - Database client for integrity checks
 * @param {boolean} datesChanged - Whether dates have changed (for updates, skip overlap check if false)
 * @returns {Promise<Object>} Validation result
 */
export const validateTermCreation = async (data, isUpdate = false, client = null, datesChanged = true) => {
  const errors = [];
  const sanitizedData = sanitizeInput(data);

  try {
    // Required fields for creation
    if (!isUpdate) {
      if (!sanitizedData.termName || sanitizedData.termName.trim().length === 0) {
        errors.push('Term name is required');
      }
      
      if (!sanitizedData.startDate) {
        errors.push('Start date is required');
      }
      
      if (!sanitizedData.endDate) {
        errors.push('End date is required');
      }
    }

    // Validate term name
    if (sanitizedData.termName) {
      if (sanitizedData.termName.trim().length < 5) {
        errors.push('Term name must be at least 5 characters long');
      }
      if (sanitizedData.termName.trim().length > 100) {
        errors.push('Term name must be less than 100 characters');
      }
    }

    // Validate dates
    if (sanitizedData.startDate && sanitizedData.endDate) {
      const startDate = new Date(sanitizedData.startDate);
      const endDate = new Date(sanitizedData.endDate);
      
      if (isNaN(startDate.getTime())) {
        errors.push('Start date is invalid');
      }
      if (isNaN(endDate.getTime())) {
        errors.push('End date is invalid');
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (startDate >= endDate) {
          errors.push('Start date must be before end date');
        }
      }
    }

    // Validate status if provided
    if (sanitizedData.status) {
      const validStatuses = ['active', 'completed', 'upcoming'];
      if (!validStatuses.includes(sanitizedData.status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // DATA INTEGRITY CHECKS (only if client is provided)
    // For updates, only validate date integrity if dates have changed
    if (client && sanitizedData.startDate && sanitizedData.endDate) {
      const integrityErrors = await validateDataIntegrity(sanitizedData, isUpdate, client, datesChanged);
      errors.push(...integrityErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };

  } catch (error) {
    console.error('❌ Error in term validation:', error);
    return {
      isValid: false,
      errors: ['Term validation failed due to internal error'],
      sanitizedData: null
    };
  }
};

/**
 * Validates data integrity for SK terms to prevent conflicts and ensure referential integrity
 * @param {Object} data - Term data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @param {Object} client - Database client
 * @param {boolean} datesChanged - Whether dates have changed (for updates, skip overlap check if false)
 * @returns {Promise<Array>} Array of integrity error messages
 */
const validateDataIntegrity = async (data, isUpdate, client, datesChanged = true) => {
  const errors = [];
  
  try {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const currentDate = new Date();
    
    // 1. TERM OVERLAP VALIDATION - Critical for data integrity
    console.log('🔍 Validating term overlap...', { 
      isUpdate, 
      datesChanged,
      willCheckOverlap: !isUpdate || datesChanged 
    });
    
    // Only perform overlap validation if:
    // - It's a new term, OR
    // - It's an update AND dates have actually changed
    if (!isUpdate || datesChanged) {
      console.log('✅ Performing overlap validation (new term or dates changed)');
      let overlapQuery;
      let overlapParams;
      
      if (isUpdate && data.termId) {
        // For updates with changed dates, exclude the current term from overlap check
        overlapQuery = `
          SELECT term_id, term_name, start_date, end_date, status 
          FROM "SK_Terms" 
          WHERE (
            (start_date <= $1 AND end_date >= $1) OR    -- New term starts during existing term
            (start_date <= $2 AND end_date >= $2) OR    -- New term ends during existing term
            (start_date >= $1 AND end_date <= $2) OR    -- New term completely contains existing term
            (start_date <= $1 AND end_date >= $2)       -- New term completely within existing term
          )
          AND status != 'completed'
          AND term_id != $3
        `;
        overlapParams = [startDate, endDate, data.termId];
      } else {
        // For new terms, check against all terms
        overlapQuery = `
          SELECT term_id, term_name, start_date, end_date, status 
          FROM "SK_Terms" 
          WHERE (
            (start_date <= $1 AND end_date >= $1) OR    -- New term starts during existing term
            (start_date <= $2 AND end_date >= $2) OR    -- New term ends during existing term
            (start_date >= $1 AND end_date <= $2) OR    -- New term completely contains existing term
            (start_date <= $1 AND end_date >= $2)       -- New term completely within existing term
          )
          AND status != 'completed'
        `;
        overlapParams = [startDate, endDate];
      }
      
      const overlapResult = await client.query(overlapQuery, overlapParams);
      
      if (overlapResult.rows.length > 0) {
        const overlappingTerms = overlapResult.rows.map(term => 
          `${term.term_name} (${new Date(term.start_date).toLocaleDateString()} - ${new Date(term.end_date).toLocaleDateString()})`
        );
        errors.push(`Term date range conflicts with existing terms: ${overlappingTerms.join(', ')}`);
        console.log('❌ Term overlap detected:', overlappingTerms);
      } else {
        console.log('✅ No term overlap detected');
      }
    } else {
      console.log('⏭️ Skipping overlap validation (update without date changes)');
    }
    
    // 2. ACTIVE TERM UNIQUENESS - Ensures only one active term at a time
    if (data.autoActivate || data.status === 'active') {
      console.log('🔍 Validating active term uniqueness...');
      const activeTermQuery = `
        SELECT term_id, term_name, start_date, end_date 
        FROM "SK_Terms" 
        WHERE status = 'active'
      `;
      
      const activeResult = await client.query(activeTermQuery);
      
      if (activeResult.rows.length > 0) {
        const activeTerm = activeResult.rows[0];
        errors.push(`Cannot activate term. Another term is already active: ${activeTerm.term_name} (${new Date(activeTerm.start_date).toLocaleDateString()} - ${new Date(activeTerm.end_date).toLocaleDateString()})`);
        console.log('❌ Active term conflict detected:', activeTerm.term_name);
      } else {
        console.log('✅ No active term conflict detected');
      }
    }
    
    // 3. TERM NAME UNIQUENESS - Prevents duplicate term names
    console.log('🔍 Validating term name uniqueness...');
    let nameQuery;
    let nameParams;
    
    if (isUpdate && data.termId) {
      // For updates, exclude the current term from uniqueness check
      nameQuery = `
        SELECT term_id, term_name 
        FROM "SK_Terms" 
        WHERE LOWER(term_name) = LOWER($1) AND term_id != $2
      `;
      nameParams = [data.termName.trim(), data.termId];
    } else {
      // For new terms, check against all terms
      nameQuery = `
        SELECT term_id, term_name 
        FROM "SK_Terms" 
        WHERE LOWER(term_name) = LOWER($1)
      `;
      nameParams = [data.termName.trim()];
    }
    
    const nameResult = await client.query(nameQuery, nameParams);
    
    if (nameResult.rows.length > 0) {
      errors.push(`Term name "${data.termName}" already exists. Please choose a different name.`);
      console.log('❌ Duplicate term name detected:', data.termName);
    } else {
      console.log('✅ Term name is unique');
    }
    
    // 4. ENHANCED DATE VALIDATION - Prevents invalid date ranges
    console.log('🔍 Validating enhanced date constraints...');
    
    // Check if start date is in the past (for new terms)
    if (!isUpdate && startDate < currentDate) {
      const daysDiff = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        errors.push(`Start date cannot be more than 30 days in the past (${daysDiff} days ago)`);
        console.log('❌ Start date too far in past:', daysDiff, 'days');
      }
    }
    
    // Check if end date is too far in the future
    const maxFutureYears = 10;
    const maxEndDate = new Date();
    maxEndDate.setFullYear(maxEndDate.getFullYear() + maxFutureYears);
    
    if (endDate > maxEndDate) {
      errors.push(`End date cannot be more than ${maxFutureYears} years in the future. Please choose a closer end date.`);
      console.log('❌ End date too far in future');
    }
    

    
    // 5. REFERENTIAL INTEGRITY CHECKS - Ensure database consistency
    console.log('🔍 Validating referential integrity...');
    
    // Check if there are any orphaned SK officials without valid terms
    const orphanedOfficialsQuery = `
      SELECT COUNT(*) as count 
      FROM "SK_Officials" so
      LEFT JOIN "SK_Terms" st ON so.term_id = st.term_id
      WHERE st.term_id IS NULL
    `;
    
    const orphanedResult = await client.query(orphanedOfficialsQuery);
    const orphanedCount = parseInt(orphanedResult.rows[0].count);
    
    if (orphanedCount > 0) {
      console.warn('⚠️ Found orphaned SK officials without valid terms:', orphanedCount);
      // This is a warning, not an error, as it doesn't prevent term creation
    }
    
    // Check if there are any terms without officials (for completed terms)
    const emptyCompletedTermsQuery = `
      SELECT COUNT(*) as count 
      FROM "SK_Terms" st
      LEFT JOIN "SK_Officials" so ON st.term_id = so.term_id
      WHERE st.status = 'completed' AND so.term_id IS NULL
    `;
    
    const emptyTermsResult = await client.query(emptyCompletedTermsQuery);
    const emptyTermsCount = parseInt(emptyTermsResult.rows[0].count);
    
    if (emptyTermsCount > 0) {
      console.warn('⚠️ Found completed terms without officials:', emptyTermsCount);
    }
    
    console.log('✅ Referential integrity checks completed');
    
    // 6. BUSINESS RULE VALIDATIONS
    console.log('🔍 Validating business rules...');
    
    // Ensure terms don't span across unreasonable time periods
    const currentYear = currentDate.getFullYear();
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    if (startYear < currentYear - 5) {
      errors.push('Start date cannot be more than 5 years in the past');
      console.log('❌ Start date too far in past');
    }
    
    if (endYear > currentYear + 10) {
      errors.push('End date cannot be more than 10 years in the future');
      console.log('❌ End date too far in future');
    }
    
    // Validate term naming convention (optional business rule)
    const termNamePattern = /^SK Term \d{4}-\d{4}$/;
    if (!termNamePattern.test(data.termName.trim())) {
      console.log('⚠️ Term name does not follow suggested pattern (SK Term YYYY-YYYY)');
      // This is a warning, not an error
    }
    
    console.log('✅ Business rule validations completed');
    
  } catch (dbError) {
    console.error('❌ Database error during integrity validation:', dbError);
    errors.push('Database integrity check failed. Please try again.');
  }
  
  return errors;
};

/**
 * Validates if activating a term would create conflicts
 * @param {string} termId - Term ID to activate
 * @param {Object} client - Database client
 * @returns {Promise<Array>} Array of validation error messages
 */
export const validateTermActivation = async (termId, client) => {
  const errors = [];
  
  try {
    console.log('🔍 Validating term activation for termId:', termId);
    
    // Check if term exists and is in 'upcoming' status
    const termQuery = `
      SELECT term_id, term_name, start_date, end_date, status 
      FROM "SK_Terms" 
      WHERE term_id = $1
    `;
    
    console.log('🔍 Executing term query with termId:', termId);
    const termResult = await client.query(termQuery, [termId]);
    console.log('🔍 Term query result:', termResult.rows);
    
    if (termResult.rows.length === 0) {
      console.error('❌ Term not found in database:', termId);
      errors.push('Term not found');
      return errors;
    }
    
    const term = termResult.rows[0];
    console.log('🔍 Found term:', {
      termId: term.term_id,
      termName: term.term_name,
      status: term.status,
      startDate: term.start_date,
      endDate: term.end_date
    });
    
    if (term.status !== 'upcoming') {
      console.error('❌ Term status validation failed:', {
        expected: 'upcoming',
        actual: term.status,
        termId: term.term_id,
        termName: term.term_name
      });
      errors.push(`Cannot activate term "${term.term_name}". Term status is '${term.status}', but only 'upcoming' terms can be activated.`);
      return errors;
    }
    
    // Check if there's already an active term
    console.log('🔍 Checking for existing active terms...');
    const activeTermQuery = `
      SELECT term_id, term_name, start_date, end_date 
      FROM "SK_Terms" 
      WHERE status = 'active'
    `;
    
    const activeResult = await client.query(activeTermQuery);
    console.log('🔍 Active terms query result:', activeResult.rows);
    
    if (activeResult.rows.length > 0) {
      const activeTerm = activeResult.rows[0];
      console.error('❌ Active term conflict detected:', {
        existingActiveTerm: {
          termId: activeTerm.term_id,
          termName: activeTerm.term_name,
          startDate: activeTerm.start_date,
          endDate: activeTerm.end_date
        },
        attemptingToActivate: {
          termId: term.term_id,
          termName: term.term_name
        }
      });
      errors.push(`Cannot activate term "${term.term_name}". Another term is already active: ${activeTerm.term_name} (${new Date(activeTerm.start_date).toLocaleDateString()} - ${new Date(activeTerm.end_date).toLocaleDateString()})`);
    } else {
      console.log('✅ No active term conflicts detected');
    }
    
    // Check if term dates are valid for activation
    const currentDate = new Date();
    const startDate = new Date(term.start_date);
    const endDate = new Date(term.end_date);
    
    console.log('🔍 Date validation:', {
      currentDate: currentDate.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateInFuture: startDate > currentDate,
      endDateInPast: endDate < currentDate
    });
    
    if (startDate > currentDate) {
      const daysUntilStart = Math.ceil((startDate - currentDate) / (1000 * 60 * 60 * 24));
      console.error('❌ Start date validation failed:', {
        startDate: startDate.toISOString(),
        currentDate: currentDate.toISOString(),
        daysUntilStart: daysUntilStart
      });
      errors.push(`Cannot activate term "${term.term_name}". Start date is ${daysUntilStart} days in the future. Wait until the start date arrives or update the term dates.`);
    }
    
    if (endDate < currentDate) {
      const daysSinceEnd = Math.ceil((currentDate - endDate) / (1000 * 60 * 60 * 24));
      console.error('❌ End date validation failed:', {
        endDate: endDate.toISOString(),
        currentDate: currentDate.toISOString(),
        daysSinceEnd: daysSinceEnd
      });
      errors.push(`Cannot activate term "${term.term_name}". End date has already passed ${daysSinceEnd} days ago. The term has ended and cannot be activated.`);
    }
    
    console.log('✅ Date validation completed');
    
  } catch (dbError) {
    console.error('❌ Database error during activation validation:', dbError);
    console.error('❌ Database error details:', {
      termId: termId,
      errorMessage: dbError.message,
      errorCode: dbError.code,
      errorStack: dbError.stack,
      timestamp: new Date().toISOString()
    });
    errors.push('Database validation failed. Please try again.');
  }
  
  console.log('🔍 Activation validation completed with errors:', errors);
  return errors;
};

/**
 * Validates if completing a term is allowed
 * @param {string} termId - Term ID to complete
 * @param {Object} client - Database client
 * @returns {Promise<Array>} Array of validation error messages
 */
export const validateTermCompletion = async (termId, client) => {
  const errors = [];
  
  try {
    // Check if term exists and is in 'active' status
    const termQuery = `
      SELECT term_id, term_name, start_date, end_date, status 
      FROM "SK_Terms" 
      WHERE term_id = $1
    `;
    
    const termResult = await client.query(termQuery, [termId]);
    
    if (termResult.rows.length === 0) {
      errors.push('Term not found');
      return errors;
    }
    
    const term = termResult.rows[0];
    
    if (term.status !== 'active') {
      errors.push(`Cannot complete term. Term status is '${term.status}', must be 'active'`);
      return errors;
    }
    
    // Check if there are active officials in this term
    const officialsQuery = `
      SELECT COUNT(*) as active_count 
      FROM "SK_Officials" 
      WHERE term_id = $1 AND is_active = true
    `;
    
    const officialsResult = await client.query(officialsQuery, [termId]);
    const activeOfficials = parseInt(officialsResult.rows[0].active_count);
    
    if (activeOfficials > 0) {
      console.warn(`⚠️ Term has ${activeOfficials} active officials. Consider reassigning them before completion.`);
      // This is a warning, not an error, as it doesn't prevent completion
    }
    
  } catch (dbError) {
    console.error('❌ Database error during completion validation:', dbError);
    errors.push('Database validation failed. Please try again.');
  }
  
  return errors;
};

/**
 * Validates SK status update data
 * @param {Object} data - Status update data
 * @returns {Object} Validation result
 */
export const validateSKStatusUpdate = (data) => {
  const errors = [];
  const sanitizedData = sanitizeInput(data);

  try {
    if (!sanitizedData.action) {
      errors.push('Action is required');
    } else {
      const validActions = ['activate', 'deactivate'];
      if (!validActions.includes(sanitizedData.action)) {
        errors.push(`Action must be one of: ${validActions.join(', ')}`);
      }
    }

    if (sanitizedData.reason && sanitizedData.reason.trim().length > 500) {
      errors.push('Reason must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };

  } catch (error) {
    console.error('❌ Error in SK status validation:', error);
    return {
      isValid: false,
      errors: ['Status validation failed due to internal error'],
      sanitizedData: null
    };
  }
};

/**
 * Validates SK bulk operation data
 * @param {Array} ids - Array of SK IDs
 * @param {string} action - Bulk action to perform
 * @returns {Object} Validation result
 */
export const validateSKBulkOperation = (ids, action) => {
  const errors = [];

  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      errors.push('At least one SK official must be selected');
    } else {
      if (ids.length > 50) {
        errors.push('Cannot perform bulk operation on more than 50 SK officials at once');
      }
      
      // Validate each ID format
      const invalidIds = ids.filter(id => !/^SK\d{3}$/.test(id));
      if (invalidIds.length > 0) {
        errors.push(`Invalid SK ID format: ${invalidIds.join(', ')}`);
      }
    }

    if (!action) {
      errors.push('Bulk action is required');
    } else {
      const validActions = ['activate', 'deactivate', 'delete'];
      if (!validActions.includes(action)) {
        errors.push(`Bulk action must be one of: ${validActions.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    console.error('❌ Error in SK bulk validation:', error);
    return {
      isValid: false,
      errors: ['Bulk operation validation failed due to internal error']
    };
  }
};

/**
 * Validates SK search parameters
 * @param {Object} params - Search parameters
 * @returns {Object} Validation result
 */
export const validateSKSearchParams = (params) => {
  const errors = [];
  const sanitizedParams = sanitizeInput(params);

  try {
    // Validate search query length
    if (sanitizedParams.q && sanitizedParams.q.length > 100) {
      errors.push('Search query must be less than 100 characters');
    }

    // Validate status filter
    if (sanitizedParams.status) {
      const validStatuses = ['all', 'active', 'inactive'];
      if (!validStatuses.includes(sanitizedParams.status)) {
        errors.push(`Status filter must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Validate position filter
    if (sanitizedParams.position) {
      if (!VALID_SK_POSITIONS.includes(sanitizedParams.position)) {
        errors.push(`Position filter must be one of: ${VALID_SK_POSITIONS.join(', ')}`);
      }
    }

    // Validate barangay filter
    if (sanitizedParams.barangay && !/^SJB\d{3}$/.test(sanitizedParams.barangay)) {
      errors.push('Barangay filter must be in format SJB001, SJB002, etc.');
    }

    // Validate term filter
    if (sanitizedParams.term && !/^TRM\d{3}$/.test(sanitizedParams.term)) {
      errors.push('Term filter must be in format TRM001, TRM002, etc.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedParams
    };

  } catch (error) {
    console.error('❌ Error in SK search validation:', error);
    return {
      isValid: false,
      errors: ['Search validation failed due to internal error'],
      sanitizedParams: null
    };
  }
};

/**
 * Checks if a barangay exists in the database
 * @param {string} barangayId - Barangay ID to check
 * @returns {Promise<boolean>} True if barangay exists
 */
export const validateBarangayExists = async (barangayId, client = null) => {
  try {
    const dbClient = client || query;
    const queryText = 'SELECT barangay_id, barangay_name FROM "Barangay" WHERE barangay_id = $1';
    
    let result;
    if (client) {
      result = await client.query(queryText, [barangayId]);
    } else {
      result = await query(queryText, [barangayId]);
    }
    
    const exists = result.rows.length > 0;
    return {
      exists,
      barangayName: exists ? result.rows[0].barangay_name : null,
      barangayId: exists ? result.rows[0].barangay_id : null
    };
  } catch (error) {
    console.error('❌ Error checking barangay existence:', error);
    return { exists: false, barangayName: null, barangayId: null };
  }
};

/**
 * Checks if an active term exists
 * @param {Object} client - Database client for transactions (optional)
 * @returns {Promise<Object|null>} Active term data or null
 */
export const getActiveTerm = async (client = null) => {
  try {
    const queryText = 'SELECT * FROM "SK_Terms" WHERE is_current = true AND is_active = true LIMIT 1';
    
    let result;
    if (client) {
      result = await client.query(queryText);
    } else {
      result = await query(queryText);
    }
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Error getting active term:', error);
    return null;
  }
};

/**
 * Checks for position conflicts in the same barangay and term
 * @param {string} position - Position to check
 * @param {string} barangayId - Barangay ID
 * @param {string} termId - Term ID
 * @param {Object} client - Database client for transactions (optional)
 * @param {string} excludeSkId - SK ID to exclude from check (for updates)
 * @returns {Promise<Object>} Object with hasConflict boolean and message
 */
export const checkPositionConflict = async (position, barangayId, termId, client = null, excludeSkId = null) => {
  try {
    let query_text = `
      SELECT COUNT(*) as count 
      FROM "SK_Officials" 
      WHERE position = $1 AND barangay_id = $2 AND term_id = $3 AND is_active = true
    `;
    let params = [position, barangayId, termId];
    
    if (excludeSkId) {
      query_text += ' AND sk_id != $4';
      params.push(excludeSkId);
    }
    
    let result;
    if (client) {
      result = await client.query(query_text, params);
    } else {
      result = await query(query_text, params);
    }
    
    const hasConflict = parseInt(result.rows[0].count) > 0;
    
    return {
      hasConflict,
      message: hasConflict 
        ? `Position '${position}' is already occupied in this barangay for the current term` 
        : null
    };
  } catch (error) {
    console.error('❌ Error checking position conflict:', error);
    return {
      hasConflict: true,
      message: 'Unable to check position availability. Please try again.'
    };
  }
};

export default {
  validateSKCreation,
  validateSKProfiling,
  validateTermCreation,
  validateTermActivation,
  validateTermCompletion,
  validateSKStatusUpdate,
  validateSKBulkOperation,
  validateSKSearchParams,
  validateBarangayExists,
  getActiveTerm,
  checkPositionConflict,
  VALID_SK_POSITIONS,
  VALID_GENDERS
};

