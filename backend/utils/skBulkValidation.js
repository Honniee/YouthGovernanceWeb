import { query } from '../config/database.js';
import { sanitizeInput, isValidEmail } from './validation.js';
import logger from './logger.js';

const allowedPositions = [
  'SK Chairperson',
  'SK Secretary',
  'SK Treasurer',
  'SK Councilor'
];

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
};

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const buildIdentityKey = (barangayId, position, email) => {
  const barangayKey = normalizeString(barangayId);
  const positionKey = normalizeString(position).toLowerCase();
  const emailKey = normalizeEmail(email);
  return `${barangayKey}|${positionKey}|${emailKey}`;
};

const loadBarangayMap = async () => {
  const result = await query('SELECT barangay_id, barangay_name FROM "Barangay"');
  const byId = new Map();
  const byName = new Map();
  result.rows.forEach((row) => {
    const id = normalizeString(row.barangay_id);
    const name = normalizeString(row.barangay_name);
    byId.set(id.toLowerCase(), { barangayId: id, barangayName: name });
    byName.set(name.toLowerCase(), { barangayId: id, barangayName: name });
  });
  return { byId, byName };
};

export const validateSKBulkImport = async (records = []) => {
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
        duplicateInDbInactive: 0
      },
      rows: [],
      errors: ['No records found in the file'],
      suggestions: {}
    };
  }

  const barangayMaps = await loadBarangayMap();

  const rows = [];
  const identityMap = new Map();
  const emailSet = new Set();
  const sanitisedRecords = records.map((raw) => sanitizeInput(raw));

  sanitisedRecords.forEach((record, index) => {
    const rowNumber = index + 1;
    const normalized = {
      first_name: normalizeString(record.firstName ?? record.first_name),
      last_name: normalizeString(record.lastName ?? record.last_name),
      middle_name: normalizeString(record.middleName ?? record.middle_name),
      suffix: normalizeString(record.suffix),
      personal_email: normalizeString(record.personalEmail ?? record.personal_email),
      position: normalizeString(record.position),
      barangay_name: normalizeString(record.barangayName ?? record.barangay_name),
      barangay_id: normalizeString(record.barangayId ?? record.barangay_id)
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

    if (!normalized.position) {
      issues.push('Position is required');
      status = 'error';
    } else if (!allowedPositions.includes(normalized.position)) {
      issues.push(`Position must be one of: ${allowedPositions.join(', ')}`);
      status = 'error';
    }

    const barangayLookup =
      (normalized.barangay_id && barangayMaps.byId.get(normalized.barangay_id.toLowerCase())) ||
      (normalized.barangay_name && barangayMaps.byName.get(normalized.barangay_name.toLowerCase())) ||
      null;

    if (!barangayLookup) {
      issues.push('Barangay name or ID is required and must match an existing barangay');
      status = 'error';
    }

    const resolvedBarangayId = barangayLookup?.barangayId ?? '';
    const resolvedBarangayName = barangayLookup?.barangayName ?? normalized.barangay_name;
    const identityKey = buildIdentityKey(resolvedBarangayId, normalized.position, normalized.personal_email);

    if (normalized.personal_email) {
      emailSet.add(normalizeEmail(normalized.personal_email));
    }

    if (!identityMap.has(identityKey)) {
      identityMap.set(identityKey, []);
    }
    identityMap.get(identityKey).push(index);

    rows.push({
      rowNumber,
      original: record,
      normalized,
      resolvedBarangayId,
      resolvedBarangayName,
      identityKey,
      status,
      issues,
      duplicate: {
        inFile: false,
        isPrimaryInFile: false,
        inDbActive: false,
        inDbInactive: false,
        emailInLydo: false
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

  const identityKeys = Array.from(identityMap.keys());
  if (identityKeys.length > 0) {
    const valuesClause = identityKeys
      .map((_, idx) => {
        const base = idx * 3;
        return `($${base + 1}, LOWER($${base + 2}), LOWER($${base + 3}))`;
      })
      .join(', ');
    const params = [];
    identityKeys.forEach((key) => {
      const [barangayId, position, email] = key.split('|');
      params.push(barangayId, position, email);
    });

    if (valuesClause) {
      const duplicateQuery = `
        SELECT 
          sk_id,
          barangay_id,
          LOWER(position) AS position,
          LOWER(personal_email) AS personal_email,
          first_name,
          last_name,
          middle_name,
          suffix,
          is_active
        FROM "SK_Officials"
        WHERE (barangay_id, LOWER(position), LOWER(personal_email)) IN (${valuesClause})
      `;

      try {
        const duplicateResult = await query(duplicateQuery, params);
        const duplicateMap = new Map();
        duplicateResult.rows.forEach((row) => {
          const key = buildIdentityKey(row.barangay_id, row.position, row.personal_email);
          if (!duplicateMap.has(key)) {
            duplicateMap.set(key, []);
          }
          duplicateMap.get(key).push({
            sk_id: row.sk_id,
            barangay_id: row.barangay_id,
            position: row.position,
            personal_email: row.personal_email,
            first_name: row.first_name,
            last_name: row.last_name,
            middle_name: row.middle_name,
            suffix: row.suffix,
            is_active: row.is_active
          });
        });

        rows.forEach((row) => {
          const matches = duplicateMap.get(row.identityKey);
          if (matches && matches.length > 0) {
            const hasActive = matches.some((match) => match.is_active === true);
            const hasInactive = matches.some((match) => match.is_active === false);
            row.duplicate.inDbActive = hasActive;
            row.duplicate.inDbInactive = hasInactive;
            row.existingMatches = matches;
            if (row.status !== 'error') {
              row.status = 'warning';
            }
            const parts = [];
            if (hasActive) parts.push('active');
            if (hasInactive) parts.push('inactive');
            row.issues.push(`Duplicate exists in system (${parts.join(' & ')})`);
          }
        });
      } catch (error) {
        logger.error('Error detecting SK duplicates', { error: error.message, stack: error.stack });
        rows.forEach((row) => {
          if (row.status === 'valid') {
            row.status = 'warning';
          }
          row.issues.push('Unable to verify duplicates against existing SK officials');
        });
      }
    }
  }

  if (emailSet.size > 0) {
    const emails = Array.from(emailSet);
    const emailQuery = `
      SELECT LOWER(personal_email) AS personal_email
      FROM "LYDO"
      WHERE LOWER(personal_email) = ANY($1)
    `;
    try {
      const result = await query(emailQuery, [emails]);
      const emailMatches = new Set(result.rows.map((row) => row.personal_email));
      rows.forEach((row) => {
        if (emailMatches.has(normalizeEmail(row.normalized.personal_email))) {
          row.duplicate.emailInLydo = true;
          if (row.status !== 'error') {
            row.status = 'warning';
          }
          row.issues.push('Email already exists in LYDO staff records');
        }
      });
    } catch (error) {
      logger.error('Error detecting LYDO email duplicates', { error: error.message, stack: error.stack });
    }
  }

  const invalidRecords = rows.filter((row) => row.status === 'error').length;
  const duplicateInFile = rows.filter((row) => row.duplicate.inFile).length;
  const duplicateInDbActive = rows.filter((row) => row.duplicate.inDbActive).length;
  const duplicateInDbInactive = rows.filter((row) => row.duplicate.inDbInactive).length;

  const summary = {
    totalRecords: rows.length,
    validRecords: rows.length - invalidRecords,
    invalidRecords,
    duplicateRecords: duplicateInFile + duplicateInDbActive + duplicateInDbInactive,
    duplicateInFile,
    duplicateInDbActive,
    duplicateInDbInactive
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
  validateSKBulkImport
};

