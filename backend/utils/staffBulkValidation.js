import { query } from '../config/database.js';
import { isValidEmail, sanitizeInput } from './validation.js';
import logger from './logger.js';

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return value.trim();
  }
  return String(value).trim();
};

const normalizeEmail = (value) => {
  const email = normalizeString(value).toLowerCase();
  return email;
};

const mapStaffRecord = (rawRecord = {}) => {
  const sanitized = sanitizeInput(rawRecord);

  const firstName =
    sanitized.first_name ??
    sanitized.firstname ??
    sanitized.first ??
    sanitized.given_name ??
    sanitized.fname ??
    '';

  const lastName =
    sanitized.last_name ??
    sanitized.lastname ??
    sanitized.last ??
    sanitized.surname ??
    sanitized.family_name ??
    sanitized.lname ??
    '';

  const middleName =
    sanitized.middle_name ??
    sanitized.middlename ??
    sanitized.middle ??
    sanitized.mname ??
    '';

  const suffix =
    sanitized.suffix ??
    sanitized.sufx ??
    sanitized['jr'] ??
    sanitized['sr'] ??
    sanitized['iii'] ??
    sanitized['iv'] ??
    '';

  const personalEmail =
    sanitized.personal_email ??
    sanitized.email ??
    sanitized.personal_mail ??
    sanitized.private_email ??
    '';

  return {
    first_name: normalizeString(firstName),
    last_name: normalizeString(lastName),
    middle_name: normalizeString(middleName),
    suffix: normalizeString(suffix),
    personal_email: normalizeString(personalEmail)
  };
};

const buildIdentityKey = (record) => {
  const first = normalizeString(record.first_name).toLowerCase();
  const last = normalizeString(record.last_name).toLowerCase();
  const email = normalizeEmail(record.personal_email);
  const middle = normalizeString(record.middle_name).toLowerCase();
  const suffix = normalizeString(record.suffix).toLowerCase();

  // Only include middle/suffix if present; otherwise use placeholder to distinguish
  const middlePart = middle ? middle : '';
  const suffixPart = suffix ? suffix : '';

  return `${first}|${last}|${email}|${middlePart}|${suffixPart}`;
};

const isActiveStaff = (row) => {
  if (!row) return false;
  const active = row.is_active === true;
  const deactivated = row.deactivated === true;
  return active && !deactivated;
};

export const validateStaffBulkImport = async (records = []) => {
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
  const identityMap = new Map();
  const emailSet = new Set();

  records.forEach((rawRecord, index) => {
    const rowNumber = index + 1;
    const mapped = mapStaffRecord(rawRecord);

    const normalized = {
      first_name: mapped.first_name,
      last_name: mapped.last_name,
      middle_name: mapped.middle_name,
      suffix: mapped.suffix,
      personal_email: mapped.personal_email,
      normalized_email: normalizeEmail(mapped.personal_email)
    };

    const issues = [];
    let status = 'valid';

    if (!normalized.first_name) {
      issues.push('First name is required');
      status = 'error';
    } else if (normalized.first_name.length > 50) {
      issues.push('First name must be 50 characters or less');
      status = 'error';
    }

    if (!normalized.last_name) {
      issues.push('Last name is required');
      status = 'error';
    } else if (normalized.last_name.length > 50) {
      issues.push('Last name must be 50 characters or less');
      status = 'error';
    }

    if (normalized.middle_name && normalized.middle_name.length > 50) {
      issues.push('Middle name must be 50 characters or less');
      status = 'error';
    }

    if (normalized.suffix && normalized.suffix.length > 50) {
      issues.push('Suffix must be 50 characters or less');
      status = 'error';
    }

    if (!normalized.personal_email) {
      issues.push('Personal email is required');
      status = 'error';
    } else if (!isValidEmail(normalized.personal_email)) {
      issues.push('Personal email must be a valid email address');
      status = 'error';
    }

    const identityKey = buildIdentityKey(normalized);

    if (normalized.normalized_email) {
      emailSet.add(normalized.normalized_email);
    }

    if (!identityMap.has(identityKey)) {
      identityMap.set(identityKey, []);
    }
    identityMap.get(identityKey).push(index);

    rows.push({
      rowNumber,
      original: rawRecord,
      mapped,
      normalized,
      identityKey,
      status,
      issues,
      duplicate: {
        inFile: false,
        isPrimaryInFile: false,
        inDbActive: false,
        inDbArchived: false
      },
      existingMatches: []
    });
  });

  identityMap.forEach((indexes) => {
    if (indexes.length > 1) {
      indexes.forEach((idx, position) => {
        const row = rows[idx];
        row.duplicate.inFile = true;
        row.duplicate.isPrimaryInFile = position === 0;
        if (row.status !== 'error') {
          row.status = 'warning';
        }
        if (position === 0) {
          row.issues.push('Duplicate group detected in file (first occurrence)');
        } else {
          row.issues.push('Duplicate record found within the file');
        }
      });
    }
  });

  const uniqueEmails = Array.from(emailSet);
  if (uniqueEmails.length > 0) {
    const placeholders = uniqueEmails.map((_, idx) => `$${idx + 1}`).join(', ');
    const queryText = `
      SELECT
        lydo_id,
        LOWER(first_name) AS first_name,
        LOWER(last_name) AS last_name,
        LOWER(COALESCE(middle_name, '')) AS middle_name,
        LOWER(COALESCE(suffix, '')) AS suffix,
        LOWER(personal_email) AS personal_email,
        personal_email AS original_email,
        first_name AS original_first_name,
        last_name AS original_last_name,
        middle_name AS original_middle_name,
        suffix AS original_suffix,
        is_active,
        deactivated
      FROM "LYDO"
      WHERE LOWER(personal_email) IN (${placeholders})
    `;

    try {
      const duplicateResult = await query(queryText, uniqueEmails);
      const duplicateMap = new Map();

      duplicateResult.rows.forEach((row) => {
        const key = `${row.first_name}|${row.last_name}|${row.personal_email}|${row.middle_name}|${row.suffix}`;
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key).push({
          lydo_id: row.lydo_id,
          is_active: row.is_active,
          deactivated: row.deactivated,
          first_name: row.original_first_name,
          last_name: row.original_last_name,
          middle_name: row.original_middle_name,
          suffix: row.original_suffix,
          personal_email: row.original_email
        });
      });

      rows.forEach((row) => {
        const matches = duplicateMap.get(row.identityKey);
        if (matches && matches.length > 0) {
          const hasActive = matches.some((match) => isActiveStaff(match));
          const hasArchived = matches.some((match) => !isActiveStaff(match));
          row.duplicate.inDbActive = hasActive;
          row.duplicate.inDbArchived = hasArchived;
          row.existingMatches = matches;
          if (row.status !== 'error') {
            row.status = 'warning';
          }
          const parts = [];
          if (hasActive) parts.push('active');
          if (hasArchived) parts.push('inactive');
          row.issues.push(`Duplicate exists in system (${parts.join(' & ')})`);
        }
      });
    } catch (error) {
      logger.error('Error detecting duplicate staff during validation', { error: error.message, stack: error.stack });
      rows.forEach((row) => {
        if (row.status === 'valid') {
          row.status = 'warning';
        }
        row.issues.push('Unable to verify duplicates in system');
      });
    }
  }

  const invalidRecords = rows.filter((row) => row.status === 'error').length;
  const duplicateInFile = rows.filter((row) => row.duplicate.inFile).length;
  const duplicateInDbActive = rows.filter((row) => row.duplicate.inDbActive).length;
  const duplicateInDbArchived = rows.filter((row) => row.duplicate.inDbArchived).length;

  const summary = {
    totalRecords: rows.length,
    validRecords: rows.filter((row) => row.status !== 'error').length,
    invalidRecords,
    duplicateRecords: duplicateInFile + duplicateInDbActive + duplicateInDbArchived,
    duplicateInFile,
    duplicateInDbActive,
    duplicateInDbArchived
  };

  const errors = rows
    .filter((row) => row.status === 'error')
    .flatMap((row) => row.issues.map((issue) => `Row ${row.rowNumber}: ${issue}`));

  return {
    isValid: invalidRecords === 0,
    summary,
    rows,
    errors,
    suggestions: summary
  };
};

export default {
  validateStaffBulkImport
};



