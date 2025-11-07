/**
 * Data Masking Utilities
 * Functions to mask sensitive data in audit logs and other non-production contexts
 */

/**
 * Mask email address
 * user@example.com -> ***@***.***
 */
export const maskEmail = (email) => {
  if (!email) return null;
  return '***@***.***';
};

/**
 * Mask contact number
 * +639123456789 -> +63***-***-****
 * 09123456789 -> 0***-***-****
 */
export const maskContact = (contact) => {
  if (!contact) return null;
  const cleaned = String(contact).replace(/\s|-/g, '');
  
  // Keep country code, mask the rest
  if (cleaned.startsWith('+63')) {
    return '+63***-***-****';
  }
  if (cleaned.startsWith('63') && cleaned.length > 2) {
    return '+63***-***-****';
  }
  if (cleaned.startsWith('0')) {
    return '0***-***-****';
  }
  return '***-***-****';
};

/**
 * Mask part of a string (keep first N and last M characters)
 * @param {string} str - String to mask
 * @param {number} keepStart - Number of characters to keep at start
 * @param {number} keepEnd - Number of characters to keep at end
 * @returns {string} Masked string
 */
const maskPart = (str, keepStart = 2, keepEnd = 2) => {
  if (!str || typeof str !== 'string') return '***';
  if (str.length <= keepStart + keepEnd) return '***';
  return str.substring(0, keepStart) + '***' + str.substring(str.length - keepEnd);
};

/**
 * Mask full name (keep first 2 and last 2 chars of each part)
 * Maria Santos Dela Cruz -> { firstName: 'Ma***', lastName: 'Cr***', middleName: 'Sa***' }
 */
export const maskFullName = (firstName, lastName, middleName = null) => {
  const masked = {
    firstName: maskPart(firstName, 2, 2),
    lastName: maskPart(lastName, 2, 2)
  };
  
  if (middleName) {
    masked.middleName = maskPart(middleName, 2, 2);
  }
  
  return masked;
};

/**
 * Extract only year from birth date for logging
 * @param {string|Date} birthDate - Birth date
 * @returns {number|null} Year only
 */
export const extractBirthYear = (birthDate) => {
  if (!birthDate) return null;
  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) return null;
    return date.getFullYear();
  } catch (error) {
    return null;
  }
};

/**
 * Mask address (keep only barangay, mask purok/zone)
 * @param {string} barangay - Barangay name
 * @param {string} purok - Purok/zone (will be masked)
 * @returns {object} Masked address info
 */
export const maskAddress = (barangay, purok = null) => {
  return {
    barangay: barangay || null,
    purok: purok ? '***' : null
  };
};

/**
 * Mask sensitive survey data for logging
 * @param {object} personalData - Personal data object
 * @returns {object} Masked personal data
 */
export const maskSurveyPersonalData = (personalData) => {
  if (!personalData) return null;
  
  return {
    email: maskEmail(personalData.email),
    contact_number: maskContact(personalData.contact_number || personalData.contactNumber),
    birth_date_year: extractBirthYear(personalData.birth_date || personalData.birthday),
    name: maskFullName(
      personalData.first_name || personalData.firstName,
      personalData.last_name || personalData.lastName,
      personalData.middle_name || personalData.middleName
    )
  };
};

