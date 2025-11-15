import { query } from '../config/database.js';
import logger from './logger.js';

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
      logger.error('Error checking for duplicate voters', { error: error.message, stack: error.stack, voterData });
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
      logger.error('Error checking for duplicate voters', { error: error.message, stack: error.stack, voterData });
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
export const validateBulkImport = async (records) => {
  const normalizeString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const normalizeGender = (value) => {
    const gender = normalizeString(value).toLowerCase();
    if (gender === 'male' || gender === 'm') return 'Male';
    if (gender === 'female' || gender === 'f') return 'Female';
    return gender ? value : '';
  };

  const formatDateParts = (year, month, day) => {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
    const safeYear = Math.trunc(year);
    const safeMonth = Math.trunc(month);
    const safeDay = Math.trunc(day);
    if (safeMonth < 1 || safeMonth > 12 || safeDay < 1 || safeDay > 31) return '';
    return `${safeYear.toString().padStart(4, '0')}-${safeMonth.toString().padStart(2, '0')}-${safeDay
      .toString()
      .padStart(2, '0')}`;
  };

  const normalizeDate = (value) => {
    if (value === null || value === undefined || value === '') return '';

    const asDateParts = (dateObj) => {
      if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '';
      return formatDateParts(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth() + 1,
        dateObj.getUTCDate()
      );
    };

    if (value instanceof Date) {
      return asDateParts(value);
    }

    const trimmed = normalizeString(value);
    if (!trimmed) return '';

    // Excel serial number (e.g., 45123)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const excelSerial = Number(trimmed);
      if (!Number.isNaN(excelSerial)) {
        const baseDate = Date.UTC(1899, 11, 30);
        const wholeDays = Math.floor(excelSerial);
        const milliseconds = Math.round((excelSerial - wholeDays) * 24 * 60 * 60 * 1000);
        const jsDate = new Date(baseDate + wholeDays * 86400000 + milliseconds);
        return asDateParts(jsDate) || '';
      }
    }

    // ISO-like (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map((part) => Number(part));
      return formatDateParts(year, month, day);
    }

    // US style (MM/DD/YYYY)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [month, day, year] = trimmed.split('/').map((part) => Number(part));
      return formatDateParts(year, month, day);
    }

    // Fallback: let Date parse, then extract UTC parts
    const parsed = new Date(trimmed);
    const normalized = asDateParts(parsed);
    return normalized || '';
  };

  if (!Array.isArray(records) || records.length === 0) {
    return {
      isValid: false,
      summary: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicateRecords: 0,
        duplicateInFile: 0,
        duplicateInDbActive: 0,
        duplicateInDbArchived: 0
      },
      rows: [],
      errors: ['No records found in the file'],
      suggestions: {}
    };
  }

  const rows = [];
  const comboKeyToIndexes = new Map();

  records.forEach((record, index) => {
    const rowNumber = index + 1;
    const normalizedRecord = {
      first_name: normalizeString(record.first_name ?? record.firstName),
      last_name: normalizeString(record.last_name ?? record.lastName),
      middle_name: normalizeString(record.middle_name ?? record.middleName),
      suffix: normalizeString(record.suffix),
      birth_date: normalizeDate(record.birth_date ?? record.birthDate),
      gender: normalizeGender(record.gender ?? record.Gender)
    };

    const issues = [];
    let status = 'valid';

    if (!normalizedRecord.first_name) {
      issues.push('First name is required');
      status = 'error';
    }

    if (!normalizedRecord.last_name) {
      issues.push('Last name is required');
      status = 'error';
    }

    if (!normalizedRecord.birth_date) {
      issues.push('Birth date is required');
      status = 'error';
    }

    if (!normalizedRecord.gender) {
      issues.push('Gender is required');
      status = 'error';
    } else if (!['Male', 'Female'].includes(normalizedRecord.gender)) {
      issues.push('Gender must be either "Male" or "Female"');
      status = 'error';
    }

    if (normalizedRecord.first_name.length > 50) {
      issues.push('First name must be 50 characters or less');
      status = 'error';
    }

    if (normalizedRecord.last_name.length > 50) {
      issues.push('Last name must be 50 characters or less');
      status = 'error';
    }

    if (normalizedRecord.middle_name && normalizedRecord.middle_name.length > 50) {
      issues.push('Middle name must be 50 characters or less');
      status = 'error';
    }

    if (normalizedRecord.suffix && normalizedRecord.suffix.length > 50) {
      issues.push('Suffix must be 50 characters or less');
      status = 'error';
    }

    if (normalizedRecord.birth_date) {
      const birthDate = new Date(normalizedRecord.birth_date);
      const today = new Date();
      if (Number.isNaN(birthDate.getTime())) {
        issues.push('Invalid birth date format');
        status = 'error';
      } else {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 18) {
          issues.push(`Voter must be at least 18 years old (age: ${age})`);
          status = 'error';
        }
        if (age > 120) {
          issues.push(`Invalid birth date (age: ${age})`);
          status = 'error';
        }
        if (birthDate > today) {
          issues.push('Birth date cannot be in the future');
          status = 'error';
        }
      }
    }

    const comboKey = (normalizedRecord.first_name && normalizedRecord.last_name && normalizedRecord.birth_date)
      ? `${normalizedRecord.first_name.toLowerCase()}|${normalizedRecord.last_name.toLowerCase()}|${normalizedRecord.birth_date}`
      : null;

    if (comboKey) {
      if (!comboKeyToIndexes.has(comboKey)) {
        comboKeyToIndexes.set(comboKey, []);
      }
      comboKeyToIndexes.get(comboKey).push(index);
    }

    rows.push({
      rowNumber,
      original: record,
      normalized: normalizedRecord,
      status,
      issues,
      duplicate: {
        inFile: false,
        isPrimaryInFile: false,
        inDbActive: false,
        inDbArchived: false
      },
      existingMatches: [],
      comboKey
    });
  });

  comboKeyToIndexes.forEach((indexes) => {
    if (indexes.length > 1) {
      indexes.forEach((idx, position) => {
        const row = rows[idx];
        row.duplicate.inFile = true;
        row.duplicate.isPrimaryInFile = position === 0;
        if (position > 0) {
          row.issues.push('Duplicate record found within the file');
          if (row.status !== 'error') {
            row.status = 'warning';
          }
        } else if (row.status !== 'error') {
          row.status = 'warning';
          row.issues.push('Duplicate group detected in file (first occurrence)');
        }
      });
    }
  });

  const uniqueCombos = Array.from(comboKeyToIndexes.keys());
  if (uniqueCombos.length > 0) {
    const params = [];
    const valueRows = uniqueCombos
      .map((key, idx) => {
        const [firstName, lastName, birthDate] = key.split('|');
        const baseIndex = idx * 3 + 1;
        params.push(firstName, lastName, birthDate);
        return `($${baseIndex}, $${baseIndex + 1}, TO_DATE($${baseIndex + 2}, 'YYYY-MM-DD'))`;
      })
      .join(', ');

    if (valueRows) {
      const duplicateQuery = `
        SELECT 
          v.voter_id,
          LOWER(v.first_name) AS first_name,
          LOWER(v.last_name) AS last_name,
          TO_CHAR(v.birth_date, 'YYYY-MM-DD') AS birth_date,
          v.is_active
        FROM "Voters_List" v
        JOIN (
          VALUES ${valueRows}
        ) AS candidates(first_name, last_name, birth_date)
          ON LOWER(v.first_name) = candidates.first_name
         AND LOWER(v.last_name) = candidates.last_name
         AND v.birth_date = candidates.birth_date
      `;

      try {
        const duplicateResult = await query(duplicateQuery, params);
        const dbDuplicateMap = new Map();

        duplicateResult.rows.forEach(row => {
          const normalizedBirthDate = normalizeDate(row.birth_date) || '';
          const key = `${row.first_name}|${row.last_name}|${normalizedBirthDate}`;
          if (!dbDuplicateMap.has(key)) {
            dbDuplicateMap.set(key, []);
          }
          dbDuplicateMap.get(key).push({
            voter_id: row.voter_id,
            is_active: row.is_active,
            birth_date: normalizedBirthDate
          });
        });

        rows.forEach(row => {
          if (!row.comboKey) return;
          const matches = dbDuplicateMap.get(row.comboKey);
          if (matches && matches.length > 0) {
            const hasActive = matches.some(match => match.is_active);
            const hasArchived = matches.some(match => !match.is_active);
            row.duplicate.inDbActive = hasActive;
            row.duplicate.inDbArchived = hasArchived;
            row.existingMatches = matches;
            const duplicateMessages = [];
            if (hasActive) duplicateMessages.push('active');
            if (hasArchived) duplicateMessages.push('archived');
            row.issues.push(`Duplicate exists in system (${duplicateMessages.join(' & ')})`);
            if (row.status !== 'error') {
              row.status = 'warning';
            }
          }
        });
      } catch (error) {
        logger.error('Error detecting duplicate voters during validation', { error: error.message, stack: error.stack });
      }
    }
  }

  const invalidRecords = rows.filter(row => row.status === 'error').length;
  const duplicateInFile = rows.filter(row => row.duplicate.inFile).length;
  const duplicateInDbActive = rows.filter(row => row.duplicate.inDbActive).length;
  const duplicateInDbArchived = rows.filter(row => row.duplicate.inDbArchived).length;

  const summary = {
    totalRecords: records.length,
    validRecords: rows.length - invalidRecords,
    invalidRecords,
    duplicateRecords: duplicateInFile + duplicateInDbActive + duplicateInDbArchived,
    duplicateInFile,
    duplicateInDbActive,
    duplicateInDbArchived
  };

  const validationErrors = rows
    .filter(row => row.status === 'error')
    .flatMap(row => row.issues.map(issue => `Row ${row.rowNumber}: ${issue}`));

  return {
    isValid: invalidRecords === 0,
    summary,
    rows,
    errors: validationErrors,
    suggestions: summary
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
    logger.error('Error checking if voter exists', { error: error.message, stack: error.stack, firstName, lastName, birthDate });
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

