import { query } from '../config/database.js';
import logger from './logger.js';

/**
 * Generates a unique organizational email for new staff members
 * Format: firstname.lastname@lydo.gov.ph
 * If duplicate exists: firstname.lastname2@lydo.gov.ph
 * 
 * @param {string} firstName - Staff member's first name
 * @param {string} lastName - Staff member's last name
 * @returns {Promise<string>} The generated organizational email
 */
export const generateOrgEmail = async (firstName, lastName) => {
  try {
    // Clean names (remove special characters, spaces, convert to lowercase)
    const cleanFirstName = cleanName(firstName);
    const cleanLastName = cleanName(lastName);
    
    // Generate base email
    let baseEmail = `${cleanFirstName}.${cleanLastName}@lydo.gov.ph`;
    let counter = 1;
    let orgEmail = baseEmail;
    
    // Check if email already exists and generate alternatives
    while (await emailExists(orgEmail)) {
      orgEmail = `${cleanFirstName}.${cleanLastName}${counter}@lydo.gov.ph`;
      counter++;
      
      // Safety check to prevent infinite loops
      if (counter > 100) {
        throw new Error('Unable to generate unique email after 100 attempts');
      }
    }
    
    logger.debug(`Generated organizational email: ${orgEmail}`, { orgEmail, firstName, lastName, counter });
    return orgEmail;
    
  } catch (error) {
    logger.error('Error generating organizational email', { error: error.message, stack: error.stack, firstName, lastName });
    throw new Error('Failed to generate organizational email');
  }
};

/**
 * Cleans a name for email generation
 * Removes special characters, spaces, and converts to lowercase
 * 
 * @param {string} name - Name to clean
 * @returns {string} Cleaned name
 */
const cleanName = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Normalize Spanish characters and other accented letters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    // Remove special characters except letters, numbers, and spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with dots
    .replace(/\s/g, '.')
    // Remove leading/trailing dots
    .replace(/^\.+|\.+$/g, '');
};

/**
 * Checks if an email already exists in the database
 * 
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists, false otherwise
 */
const emailExists = async (email) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM "LYDO" WHERE email = $1',
      [email]
    );
    
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error('Error checking email existence', { error: error.message, stack: error.stack, email });
    // If we can't check, assume it exists to be safe
    return true;
  }
};

/**
 * Generates alternative email formats if the standard format is taken
 * 
 * @param {string} firstName - Staff member's first name
 * @param {string} lastName - Staff member's last name
 * @returns {Promise<string[]>} Array of alternative email formats
 */
export const generateAlternativeEmails = async (firstName, lastName) => {
  const alternatives = [];
  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);
  
  // Alternative formats
  const formats = [
    `${cleanFirstName}${cleanLastName}@lydo.gov.ph`,
    `${cleanFirstName[0]}.${cleanLastName}@lydo.gov.ph`,
    `${cleanFirstName}.${cleanLastName[0]}@lydo.gov.ph`,
    `${cleanFirstName}_${cleanLastName}@lydo.gov.ph`,
    `${cleanFirstName}-${cleanLastName}@lydo.gov.ph`
  ];
  
  // Check which ones are available
  for (const format of formats) {
    if (!(await emailExists(format))) {
      alternatives.push(format);
    }
  }
  
  return alternatives;
};

/**
 * Validates email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Extracts domain from email
 * 
 * @param {string} email - Email address
 * @returns {string} Domain part of the email
 */
export const extractEmailDomain = (email) => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
};

/**
 * Checks if email is from LYDO domain
 * 
 * @param {string} email - Email to check
 * @returns {boolean} True if LYDO domain, false otherwise
 */
export const isLYDOEmail = (email) => {
  const domain = extractEmailDomain(email);
  return domain === 'lydo.gov.ph';
};

/**
 * Generates a unique organizational email for SK officials
 * Format: firstInitial+lastname.barangay@lydo.gov.ph
 * If duplicate exists: firstInitial+lastname.barangay2@lydo.gov.ph
 * 
 * @param {string} firstName - SK official's first name
 * @param {string} lastName - SK official's last name
 * @param {string} barangayName - Barangay name (e.g., "Aguila", "Bagong Pook")
 * @returns {Promise<string>} The generated organizational email
 */
export const generateSKOrgEmail = async (firstName, lastName, barangayName) => {
  try {
    // Clean names and barangay name
    const cleanFirstName = cleanName(firstName);
    const cleanLastName = cleanName(lastName);
    const cleanBarangayName = cleanName(barangayName);
    
    // Get first letter of first name
    const firstInitial = cleanFirstName.charAt(0).toLowerCase();
    
    // Generate base email: firstInitial+lastname.barangay@lydo.gov.ph
    let baseEmail = `${firstInitial}${cleanLastName}.${cleanBarangayName}@lydo.gov.ph`;
    let counter = 1;
    let orgEmail = baseEmail;
    
    // Check if email already exists and generate alternatives
    while (await skEmailExists(orgEmail)) {
      orgEmail = `${firstInitial}${cleanLastName}.${cleanBarangayName}${counter}@lydo.gov.ph`;
      counter++;
      
      // Safety check to prevent infinite loops
      if (counter > 100) {
        throw new Error('Unable to generate unique SK email after 100 attempts');
      }
    }
    
    logger.debug(`Generated SK organizational email: ${orgEmail}`, { orgEmail, firstName, lastName, barangayName, counter });
    return orgEmail;
    
  } catch (error) {
    logger.error('Error generating SK organizational email', { error: error.message, stack: error.stack, firstName, lastName, barangayName });
    throw new Error('Failed to generate SK organizational email');
  }
};

/**
 * Checks if an SK email already exists in the database
 * Checks both LYDO and SK_Officials tables to prevent conflicts
 * 
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists, false otherwise
 */
const skEmailExists = async (email) => {
  try {
    // Check in LYDO table (staff emails)
    const lydoResult = await query(
      'SELECT COUNT(*) as count FROM "LYDO" WHERE email = $1',
      [email]
    );
    
    // Check in SK_Officials table
    const skResult = await query(
      'SELECT COUNT(*) as count FROM "SK_Officials" WHERE email = $1',
      [email]
    );
    
    const lydoCount = parseInt(lydoResult.rows[0].count);
    const skCount = parseInt(skResult.rows[0].count);
    
    return (lydoCount + skCount) > 0;
    
  } catch (error) {
    logger.error('Error checking SK email existence', { error: error.message, stack: error.stack, email });
    // If we can't check, assume it exists to be safe
    return true;
  }
};

/**
 * Generates alternative SK email formats if the standard format is taken
 * 
 * @param {string} firstName - SK official's first name
 * @param {string} lastName - SK official's last name
 * @param {string} barangayName - Barangay name
 * @returns {Promise<string[]>} Array of alternative email formats
 */
export const generateAlternativeSKEmails = async (firstName, lastName, barangayName) => {
  const alternatives = [];
  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);
  const cleanBarangayName = cleanName(barangayName);
  const firstInitial = cleanFirstName.charAt(0).toLowerCase();
  
  // Alternative formats for SK officials
  const formats = [
    `${cleanFirstName}.${cleanLastName}.${cleanBarangayName}@lydo.gov.ph`,
    `${firstInitial}.${cleanLastName}.${cleanBarangayName}@lydo.gov.ph`,
    `${cleanLastName}.${cleanBarangayName}@lydo.gov.ph`,
    `${firstInitial}${cleanLastName}${cleanBarangayName}@lydo.gov.ph`,
    `${firstInitial}_${cleanLastName}_${cleanBarangayName}@lydo.gov.ph`,
    `${firstInitial}-${cleanLastName}-${cleanBarangayName}@lydo.gov.ph`
  ];
  
  // Check which ones are available
  for (const format of formats) {
    if (!(await skEmailExists(format))) {
      alternatives.push(format);
    }
  }
  
  return alternatives;
};
