/**
 * Utility functions to parse contact mismatch information from validation comments
 */

import logger from './logger.js';

/**
 * Parse contact mismatch information from validation comments
 * @param {string} validationComments - The validation comments text
 * @returns {Object|null} - Parsed contact mismatch info or null if not a contact mismatch
 */
export const parseContactMismatch = (validationComments) => {
  if (!validationComments) return null;

  // Check if this is a contact mismatch comment
  const isContactMismatch = validationComments.includes('POTENTIAL DUPLICATE') || 
                            validationComments.includes('CONTACT CONFLICT') ||
                            validationComments.includes('different contact info');

  if (!isContactMismatch) return null;

  // Extract existing contact info - pattern: "Existing: +639123456789 / email@example.com."
  // Fixed regex to properly capture email addresses - use greedy matching to capture full email
  // Stop at period+space, period at end, or whitespace before "New:" or end of string
  const existingContactMatch = validationComments.match(/Existing:\s*([^/\n]+?)\s*\/\s*([^\s\n]+)(?=\.\s|\.$|\s+New:|$)/i);
  // Extract new contact info - pattern: "New: +639123656789 / email@example.com."
  const newContactMatch = validationComments.match(/New:\s*([^/\n]+?)\s*\/\s*([^\s\n]+)(?=\.\s|\.$|$)/i);

  if (!existingContactMatch || !newContactMatch) {
    // Try alternative format - more lenient parsing
    const altExistingMatch = validationComments.match(/Existing:\s*([^\n]+?)(?:\s*\.|\s+New:|$)/i);
    const altNewMatch = validationComments.match(/New:\s*([^\n]+?)(?:\s*\.|$)/i);
    
    if (altExistingMatch && altNewMatch) {
      // Split by "/" and trim each part
      const existingParts = altExistingMatch[1].trim().split(/\s*\/\s*/).map(p => p.trim());
      const newParts = altNewMatch[1].trim().split(/\s*\/\s*/).map(p => p.trim());
      
      return {
        type: validationComments.includes('CONTACT CONFLICT') ? 'conflict' : 'mismatch',
        existing: {
          contact: existingParts[0] || null,
          email: existingParts[1] || null
        },
        new: {
          contact: newParts[0] || null,
          email: newParts[1] || null
        },
        severity: validationComments.includes('HIGH PRIORITY') ? 'high' : 'medium',
        hasConflict: validationComments.includes('already used by another profile')
      };
    }
    
    // Log if parsing fails for debugging
    logger.warn('Could not parse contact mismatch from validation comments', { validationComments: validationComments.substring(0, 200) });
    return null;
  }

  return {
    type: validationComments.includes('CONTACT CONFLICT') ? 'conflict' : 'mismatch',
    existing: {
      contact: existingContactMatch[1]?.trim() || null,
      email: existingContactMatch[2]?.trim() || null
    },
    new: {
      contact: newContactMatch[1]?.trim() || null,
      email: newContactMatch[2]?.trim() || null
    },
    severity: validationComments.includes('HIGH PRIORITY') ? 'high' : 'medium',
    hasConflict: validationComments.includes('already used by another profile')
  };
};

/**
 * Check if validation comments indicate a contact mismatch
 * @param {string} validationComments - The validation comments text
 * @returns {boolean} - True if this is a contact mismatch
 */
export const isContactMismatch = (validationComments) => {
  if (!validationComments) return false;
  return validationComments.includes('POTENTIAL DUPLICATE') || 
         validationComments.includes('CONTACT CONFLICT') ||
         validationComments.includes('different contact info');
};

/**
 * Extract conflicting youth info from validation comments (if conflict exists)
 * @param {string} validationComments - The validation comments text
 * @returns {Object|null} - Conflicting youth info or null
 */
export const parseConflictInfo = (validationComments) => {
  if (!validationComments || !validationComments.includes('already used by another profile')) {
    return null;
  }

  // Extract conflicting profile name and ID
  const conflictMatch = validationComments.match(/already used by another profile:\s*([^(]+)\s*\(([^)]+)\)/i);
  
  if (conflictMatch) {
    return {
      name: conflictMatch[1]?.trim() || null,
      youth_id: conflictMatch[2]?.trim() || null
    };
  }

  return null;
};

