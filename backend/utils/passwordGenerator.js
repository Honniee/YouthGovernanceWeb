import crypto from 'crypto';
import logger from './logger.js';

/**
 * Generates a secure random password for new staff members
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} The generated password
 */
export const generateSecurePassword = (length = 12) => {
  try {
    // Character sets for password generation
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    // Ensure at least one character from each set
    let password = '';
    
    // Add one character from each required set
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the remaining length with random characters from all sets
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password to make it more random
    password = shuffleString(password);
    
    logger.debug(`Generated secure password (${length} characters)`, { length });
    return password;
    
  } catch (error) {
    logger.error('Error generating password', { error: error.message, stack: error.stack, length });
    // Fallback to a simple password if generation fails
    return generateFallbackPassword(length);
  }
};

/**
 * Shuffles a string to randomize character positions
 * @param {string} str - String to shuffle
 * @returns {string} Shuffled string
 */
const shuffleString = (str) => {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

/**
 * Fallback password generator using crypto module
 * @param {number} length - Length of the password
 * @returns {string} Fallback password
 */
const generateFallbackPassword = (length) => {
  try {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Use crypto.randomBytes for better randomness
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
  } catch (error) {
    // Ultimate fallback - simple random generation
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password;
  }
};

/**
 * Generates a temporary password for password reset
 * @returns {string} Temporary password
 */
export const generateTemporaryPassword = () => {
  return generateSecurePassword(8);
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and feedback
 */
export const validatePasswordStrength = (password) => {
  const feedback = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include at least one lowercase letter');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include at least one uppercase letter');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one number');
  
  if (/[!@#$%^&*]/.test(password)) score += 1;
  else feedback.push('Include at least one special character (!@#$%^&*)');
  
  // Strength rating
  let strength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    score,
    strength,
    feedback,
    isValid: score >= 3
  };
};

