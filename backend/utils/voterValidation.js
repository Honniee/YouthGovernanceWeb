import { query } from '../config/database.js';

// === VALIDATION RULES ===

/**
 * Validate voter creation data
 * @param {Object} voterData - Voter data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateVoterCreation = async (voterData) => {
  const errors = [];

  // Required fields validation
  if (!voterData.first_name || voterData.first_name.trim() === '') {
    errors.push('First name is required');
  }

  if (!voterData.last_name || voterData.last_name.trim() === '') {
    errors.push('Last name is required');
  }

  if (!voterData.birth_date) {
    errors.push('Birth date is required');
  }

  if (!voterData.gender) {
    errors.push('Gender is required');
  }

  // Field length validation
  if (voterData.first_name && voterData.first_name.length > 50) {
    errors.push('First name must be 50 characters or less');
  }

  if (voterData.last_name && voterData.last_name.length > 50) {
    errors.push('Last name must be 50 characters or less');
  }

  if (voterData.middle_name && voterData.middle_name.length > 50) {
    errors.push('Middle name must be 50 characters or less');
  }

  if (voterData.suffix && voterData.suffix.length > 50) {
    errors.push('Suffix must be 50 characters or less');
  }

  // Gender validation
  if (voterData.gender && !['Male', 'Female'].includes(voterData.gender)) {
    errors.push('Gender must be either "Male" or "Female"');
  }

  // Birth date validation
  if (voterData.birth_date) {
    const birthDate = new Date(voterData.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      errors.push('Voter must be at least 18 years old');
    }

    if (age > 120) {
      errors.push('Invalid birth date');
    }

    if (birthDate > today) {
      errors.push('Birth date cannot be in the future');
    }
  }

  // Check for duplicate voters (same name and birth date)
  if (voterData.first_name && voterData.last_name && voterData.birth_date) {
    try {
      const duplicateQuery = `
        SELECT voter_id, first_name, last_name, birth_date
        FROM "Voters_List"
        WHERE LOWER(first_name) = LOWER($1)
        AND LOWER(last_name) = LOWER($2)
        AND birth_date = $3
        AND is_active = true
      `;
      
      const duplicateResult = await query(duplicateQuery, [
        voterData.first_name.trim(),
        voterData.last_name.trim(),
        voterData.birth_date
      ]);

      if (duplicateResult.rows.length > 0) {
        errors.push('A voter with the same name and birth date already exists');
      }
    } catch (error) {
      console.error('Error checking for duplicate voters:', error);
      errors.push('Error checking for duplicate voters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate voter update data
 * @param {Object} voterData - Voter data to validate
 * @param {string} voterId - ID of the voter being updated
 * @returns {Object} Validation result with isValid and errors
 */
export const validateVoterUpdate = async (voterData, voterId = null) => {
  const errors = [];

  // Required fields validation
  if (!voterData.first_name || voterData.first_name.trim() === '') {
    errors.push('First name is required');
  }

  if (!voterData.last_name || voterData.last_name.trim() === '') {
    errors.push('Last name is required');
  }

  if (!voterData.birth_date) {
    errors.push('Birth date is required');
  }

  if (!voterData.gender) {
    errors.push('Gender is required');
  }

  // Field length validation
  if (voterData.first_name && voterData.first_name.length > 50) {
    errors.push('First name must be 50 characters or less');
  }

  if (voterData.last_name && voterData.last_name.length > 50) {
    errors.push('Last name must be 50 characters or less');
  }

  if (voterData.middle_name && voterData.middle_name.length > 50) {
    errors.push('Middle name must be 50 characters or less');
  }

  if (voterData.suffix && voterData.suffix.length > 50) {
    errors.push('Suffix must be 50 characters or less');
  }

  // Gender validation
  if (voterData.gender && !['Male', 'Female'].includes(voterData.gender)) {
    errors.push('Gender must be either "Male" or "Female"');
  }

  // Birth date validation
  if (voterData.birth_date) {
    const birthDate = new Date(voterData.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      errors.push('Voter must be at least 18 years old');
    }

    if (age > 120) {
      errors.push('Invalid birth date');
    }

    if (birthDate > today) {
      errors.push('Birth date cannot be in the future');
    }
  }

  // Check for duplicate voters (excluding current voter)
  if (voterData.first_name && voterData.last_name && voterData.birth_date && voterId) {
    try {
      const duplicateQuery = `
        SELECT voter_id, first_name, last_name, birth_date
        FROM "Voters_List"
        WHERE LOWER(first_name) = LOWER($1)
        AND LOWER(last_name) = LOWER($2)
        AND birth_date = $3
        AND voter_id != $4
        AND is_active = true
      `;
      
      const duplicateResult = await query(duplicateQuery, [
        voterData.first_name.trim(),
        voterData.last_name.trim(),
        voterData.birth_date,
        voterId
      ]);

      if (duplicateResult.rows.length > 0) {
        errors.push('A voter with the same name and birth date already exists');
      }
    } catch (error) {
      console.error('Error checking for duplicate voters:', error);
      errors.push('Error checking for duplicate voters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate bulk import data
 * @param {Array} records - Array of voter records to validate
 * @returns {Object} Validation result with isValid, errors, and suggestions
 */
export const validateBulkImport = (records) => {
  const errors = [];
  const suggestions = {
    totalRecords: records.length,
    validRecords: 0,
    invalidRecords: 0,
    commonIssues: []
  };

  if (!Array.isArray(records) || records.length === 0) {
    errors.push('No records found in the file');
    return {
      isValid: false,
      errors,
      suggestions
    };
  }

  // Track common issues
  const issueCounts = {
    missingFirstName: 0,
    missingLastName: 0,
    missingBirthDate: 0,
    missingGender: 0,
    invalidGender: 0,
    invalidBirthDate: 0,
    underage: 0,
    duplicateNames: 0
  };

  const seenNames = new Set();

  records.forEach((record, index) => {
    const rowNumber = index + 1;
    let rowHasErrors = false;

    // Required fields
    if (!record.first_name || record.first_name.trim() === '') {
      errors.push(`Row ${rowNumber}: First name is required`);
      issueCounts.missingFirstName++;
      rowHasErrors = true;
    }

    if (!record.last_name || record.last_name.trim() === '') {
      errors.push(`Row ${rowNumber}: Last name is required`);
      issueCounts.missingLastName++;
      rowHasErrors = true;
    }

    if (!record.birth_date) {
      errors.push(`Row ${rowNumber}: Birth date is required`);
      issueCounts.missingBirthDate++;
      rowHasErrors = true;
    }

    if (!record.gender) {
      errors.push(`Row ${rowNumber}: Gender is required`);
      issueCounts.missingGender++;
      rowHasErrors = true;
    }

    // Field length validation
    if (record.first_name && record.first_name.length > 50) {
      errors.push(`Row ${rowNumber}: First name must be 50 characters or less`);
      rowHasErrors = true;
    }

    if (record.last_name && record.last_name.length > 50) {
      errors.push(`Row ${rowNumber}: Last name must be 50 characters or less`);
      rowHasErrors = true;
    }

    if (record.middle_name && record.middle_name.length > 50) {
      errors.push(`Row ${rowNumber}: Middle name must be 50 characters or less`);
      rowHasErrors = true;
    }

    if (record.suffix && record.suffix.length > 50) {
      errors.push(`Row ${rowNumber}: Suffix must be 50 characters or less`);
      rowHasErrors = true;
    }

    // Gender validation
    if (record.gender && !['Male', 'Female'].includes(record.gender)) {
      errors.push(`Row ${rowNumber}: Gender must be either "Male" or "Female"`);
      issueCounts.invalidGender++;
      rowHasErrors = true;
    }

    // Birth date validation
    if (record.birth_date) {
      const birthDate = new Date(record.birth_date);
      const today = new Date();

      if (isNaN(birthDate.getTime())) {
        errors.push(`Row ${rowNumber}: Invalid birth date format`);
        issueCounts.invalidBirthDate++;
        rowHasErrors = true;
      } else {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          errors.push(`Row ${rowNumber}: Voter must be at least 18 years old (age: ${age})`);
          issueCounts.underage++;
          rowHasErrors = true;
        }

        if (age > 120) {
          errors.push(`Row ${rowNumber}: Invalid birth date (age: ${age})`);
          issueCounts.invalidBirthDate++;
          rowHasErrors = true;
        }

        if (birthDate > today) {
          errors.push(`Row ${rowNumber}: Birth date cannot be in the future`);
          issueCounts.invalidBirthDate++;
          rowHasErrors = true;
        }
      }
    }

    // Check for duplicate names within the file
    if (record.first_name && record.last_name) {
      const nameKey = `${record.first_name.trim().toLowerCase()}_${record.last_name.trim().toLowerCase()}`;
      if (seenNames.has(nameKey)) {
        errors.push(`Row ${rowNumber}: Duplicate name found in the file`);
        issueCounts.duplicateNames++;
        rowHasErrors = true;
      } else {
        seenNames.add(nameKey);
      }
    }

    if (!rowHasErrors) {
      suggestions.validRecords++;
    } else {
      suggestions.invalidRecords++;
    }
  });

  // Generate suggestions based on common issues
  if (issueCounts.missingFirstName > 0) {
    suggestions.commonIssues.push(`${issueCounts.missingFirstName} records missing first name`);
  }
  if (issueCounts.missingLastName > 0) {
    suggestions.commonIssues.push(`${issueCounts.missingLastName} records missing last name`);
  }
  if (issueCounts.missingBirthDate > 0) {
    suggestions.commonIssues.push(`${issueCounts.missingBirthDate} records missing birth date`);
  }
  if (issueCounts.missingGender > 0) {
    suggestions.commonIssues.push(`${issueCounts.missingGender} records missing gender`);
  }
  if (issueCounts.invalidGender > 0) {
    suggestions.commonIssues.push(`${issueCounts.invalidGender} records have invalid gender (use "Male" or "Female")`);
  }
  if (issueCounts.invalidBirthDate > 0) {
    suggestions.commonIssues.push(`${issueCounts.invalidBirthDate} records have invalid birth date`);
  }
  if (issueCounts.underage > 0) {
    suggestions.commonIssues.push(`${issueCounts.underage} records have voters under 18 years old`);
  }
  if (issueCounts.duplicateNames > 0) {
    suggestions.commonIssues.push(`${issueCounts.duplicateNames} records have duplicate names in the file`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
};

/**
 * Sanitize voter data
 * @param {Object} voterData - Raw voter data
 * @returns {Object} Sanitized voter data
 */
export const sanitizeVoterData = (voterData) => {
  return {
    first_name: voterData.first_name ? voterData.first_name.trim() : '',
    last_name: voterData.last_name ? voterData.last_name.trim() : '',
    middle_name: voterData.middle_name ? voterData.middle_name.trim() : '',
    suffix: voterData.suffix ? voterData.suffix.trim() : '',
    birth_date: voterData.birth_date,
    gender: voterData.gender
  };
};

/**
 * Check if voter exists in database
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} birthDate - Birth date
 * @param {string} excludeId - Voter ID to exclude from check
 * @returns {Promise<boolean>} True if voter exists
 */
export const checkVoterExists = async (firstName, lastName, birthDate, excludeId = null) => {
  try {
    let queryText = `
      SELECT voter_id
      FROM "Voters_List"
      WHERE LOWER(first_name) = LOWER($1)
      AND LOWER(last_name) = LOWER($2)
      AND birth_date = $3
      AND is_active = true
    `;
    
    let queryParams = [firstName.trim(), lastName.trim(), birthDate];

    if (excludeId) {
      queryText += ' AND voter_id != $4';
      queryParams.push(excludeId);
    }

    const result = await query(queryText, queryParams);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking if voter exists:', error);
    return false;
  }
};

export default {
  validateVoterCreation,
  validateVoterUpdate,
  validateBulkImport,
  sanitizeVoterData,
  checkVoterExists
};

