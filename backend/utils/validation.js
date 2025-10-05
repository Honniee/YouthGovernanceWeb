/**
 * Validation schemas and functions for Staff Management and Youth Profiles
 */

/**
 * Enhanced input sanitization to prevent XSS and injection attacks
 * @param {object} data - Data to sanitize
 * @returns {object} Sanitized data
 */
export const sanitizeInput = (data) => {
  // Handle arrays specially to preserve array structure
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'string') {
        return item
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/[<>]/g, '') // Remove < and >
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove event handlers
          .replace(/data:/gi, '') // Remove data: protocol
          .replace(/vbscript:/gi, '') // Remove vbscript: protocol
          .trim();
      } else if (typeof item === 'object' && item !== null) {
        return sanitizeInput(item);
      } else {
        return item;
      }
    });
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remove HTML tags and dangerous characters
      sanitized[key] = value
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/data:/gi, '') // Remove data: protocol
        .replace(/vbscript:/gi, '') // Remove vbscript: protocol
        .trim();
    } else if (Array.isArray(value)) {
      // Handle arrays specially
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * SQL injection prevention check
 * @param {string} value - Value to check
 * @returns {boolean} True if safe, false if suspicious
 */
export const isSQLInjectionSafe = (value) => {
  if (typeof value !== 'string') return true;
  
  // Check for common SQL injection patterns
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script)\b)/i,
    /(\b(and|or)\b\s+\d+\s*=\s*\d+)/i,
    /(\b(and|or)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(xp_|sp_)\w+)/i,
    /(\b(cast|convert)\s*\()/i,
    /(\b(declare|set)\s+@\w+)/i
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * Enhanced email validation
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Additional checks
  if (!emailRegex.test(email)) return false;
  if (email.length > 254) return false; // RFC 5321 limit
  if (email.split('@')[0].length > 64) return false; // Local part limit
  if (email.split('@')[1].length > 253) return false; // Domain part limit
  
  return true;
};

/**
 * Enhanced phone validation
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Clean the phone number
  const cleaned = phone.replace(/\s+/g, '');
  
  // Philippine phone number patterns
  const phonePatterns = [
    /^(\+63|63|0)?9\d{9}$/, // Mobile numbers
    /^(\+63|63|0)?[2-8]\d{7}$/, // Landline numbers
    /^(\+63|63|0)?[2-8]\d{8}$/ // Some landline numbers
  ];
  
  return phonePatterns.some(pattern => pattern.test(cleaned));
};

/**
 * Validates staff creation data with enhanced security
 * @param {object} data - Staff data to validate
 * @returns {object} Validation result with isValid and errors
 */
export const validateStaffCreation = (data) => {
  const errors = [];
  
  // Required fields validation
  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push('First name is required');
  }
  
  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }
  
  if (!data.personalEmail || data.personalEmail.trim().length === 0) {
    errors.push('Personal email is required');
  }
  
  if (!data.roleId || data.roleId.trim().length === 0) {
    errors.push('Role is required');
  }
  
  // SQL injection check
  if (data.firstName && !isSQLInjectionSafe(data.firstName)) {
    errors.push('First name contains invalid characters');
  }
  
  if (data.lastName && !isSQLInjectionSafe(data.lastName)) {
    errors.push('Last name contains invalid characters');
  }
  
  if (data.middleName && !isSQLInjectionSafe(data.middleName)) {
    errors.push('Middle name contains invalid characters');
  }
  
  if (data.suffix && !isSQLInjectionSafe(data.suffix)) {
    errors.push('Suffix contains invalid characters');
  }
  
  // Field length validation
  if (data.firstName && data.firstName.trim().length > 50) {
    errors.push('First name must be 50 characters or less');
  }
  
  if (data.lastName && data.lastName.trim().length > 50) {
    errors.push('Last name must be 50 characters or less');
  }
  
  if (data.middleName && data.middleName.trim().length > 50) {
    errors.push('Middle name must be 50 characters or less');
  }
  
  if (data.suffix && data.suffix.trim().length > 50) {
    errors.push('Suffix must be 50 characters or less');
  }
  
  // Email validation
  if (data.personalEmail && !isValidEmail(data.personalEmail)) {
    errors.push('Personal email must be a valid email address');
  }
  
  // Phone validation (if provided)
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Phone number must be a valid phone number');
  }
  
  // Address validation (if provided)
  if (data.address && data.address.trim().length > 500) {
    errors.push('Address must be 500 characters or less');
  }
  
  // Role validation
  if (data.roleId && !/^ROL\d{3}$/.test(data.roleId)) {
    errors.push('Invalid role ID format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates staff update data with enhanced security
 * @param {object} data - Staff data to validate
 * @returns {object} Validation result with isValid and errors
 */
export const validateStaffUpdate = (data) => {
  const errors = [];
  
  // At least one field should be provided for update
  const hasUpdateFields = Object.keys(data).some(key => 
    key !== 'lydo_id' && data[key] !== undefined && data[key] !== null
  );
  
  if (!hasUpdateFields) {
    errors.push('At least one field must be provided for update');
  }
  
  // Validate individual fields if provided
  if (data.firstName !== undefined) {
    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push('First name cannot be empty');
    }
    if (data.firstName.trim().length > 50) {
      errors.push('First name must be 50 characters or less');
    }
    if (!isSQLInjectionSafe(data.firstName)) {
      errors.push('First name contains invalid characters');
    }
  }
  
  if (data.lastName !== undefined) {
    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push('Last name cannot be empty');
    }
    if (data.lastName.trim().length > 50) {
      errors.push('Last name must be 50 characters or less');
    }
    if (!isSQLInjectionSafe(data.lastName)) {
      errors.push('Last name contains invalid characters');
    }
  }
  
  if (data.personalEmail !== undefined) {
    if (!data.personalEmail || data.personalEmail.trim().length === 0) {
      errors.push('Personal email cannot be empty');
    }
    if (!isValidEmail(data.personalEmail)) {
      errors.push('Personal email must be a valid email address');
    }
  }
  
  if (data.roleId !== undefined) {
    if (!data.roleId || data.roleId.trim().length === 0) {
      errors.push('Role cannot be empty');
    }
    if (!/^ROL\d{3}$/.test(data.roleId)) {
      errors.push('Invalid role ID format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates status update data
 * @param {object} data - Status update data to validate
 * @returns {object} Validation result with isValid and errors
 */
export const validateStatusUpdate = (data) => {
  const errors = [];
  
  if (!data.status) {
    errors.push('Status is required');
  }
  
  if (data.status && !['active', 'deactivated'].includes(data.status)) {
    errors.push('Status must be either "active" or "deactivated"');
  }
  
  // Reason is optional when deactivating
  
  if (data.reason && data.reason.trim().length > 500) {
    errors.push('Reason must be 500 characters or less');
  }
  
  // SQL injection check for reason
  if (data.reason && !isSQLInjectionSafe(data.reason)) {
    errors.push('Reason contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates bulk operation data
 * @param {object} data - Bulk operation data to validate
 * @returns {object} Validation result with isValid and errors
 */
export const validateBulkOperation = (data) => {
  const errors = [];
  
  if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    errors.push('Staff IDs array is required and cannot be empty');
  }
  
  if (data.ids && data.ids.length > 100) {
    errors.push('Cannot process more than 100 staff members at once');
  }
  
  if (data.ids) {
    // Validate each ID format
    for (let i = 0; i < data.ids.length; i++) {
      if (!/^LYDO\d{3}$/.test(data.ids[i])) {
        errors.push(`Invalid LYDO ID format at index ${i}: ${data.ids[i]}`);
      }
    }
  }
  
  if (data.action && !['activate', 'deactivate'].includes(data.action)) {
    errors.push('Action must be either "activate" or "deactivate"');
  }
  
  // Reason is optional for bulk deactivation
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates pagination parameters with enhanced security
 * @param {object} params - Query parameters
 * @returns {object} Validated pagination object
 */
export const validatePagination = (params, maxLimit = 100) => {
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  
  // Ensure reasonable limits - use provided maxLimit parameter
  const validatedLimit = Math.min(Math.max(limit, 1), maxLimit);
  const validatedPage = Math.max(page, 1);
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    offset: (validatedPage - 1) * validatedLimit
  };
};

/**
 * Validates sorting parameters with enhanced security
 * @param {object} params - Query parameters
 * @returns {object} Validated sorting object
 */
export const validateSorting = (params) => {
  const allowedFields = ['first_name', 'last_name', 'email', 'created_at', 'is_active', 'role_id'];
  const allowedOrders = ['asc', 'desc'];
  
  const sortBy = allowedFields.includes(params.sortBy) ? params.sortBy : 'last_name';
  const sortOrder = allowedOrders.includes(params.sortOrder?.toLowerCase()) ? params.sortOrder.toLowerCase() : 'asc';
  
  return {
    sortBy,
    sortOrder
  };
};

/**
 * Validates search query parameters
 * @param {object} params - Query parameters
 * @returns {object} Validated search object
 */
export const validateSearchParams = (params) => {
  const errors = [];
  
  if (params.q && typeof params.q !== 'string') {
    errors.push('Search query must be a string');
  }
  
  if (params.q && params.q.length > 100) {
    errors.push('Search query must be 100 characters or less');
  }
  
  if (params.q && !isSQLInjectionSafe(params.q)) {
    errors.push('Search query contains invalid characters');
  }
  
  if (params.status && !['active', 'deactivated', 'all'].includes(params.status)) {
    errors.push('Status must be either "active", "deactivated", or "all"');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    searchQuery: params.q || '',
    status: params.status || 'all'
  };
};

/**
 * Validate youth profile data
 * @param {object} data - Youth profile data to validate
 * @returns {object} Validation result with isValid flag and errors array
 */
export const validateYouthProfile = (data) => {
  const errors = [];
  
  // Required fields
  if (!data.first_name || typeof data.first_name !== 'string' || data.first_name.trim().length === 0) {
    errors.push('First name is required');
  } else if (data.first_name.trim().length < 2) {
    errors.push('First name must be at least 2 characters long');
  } else if (data.first_name.trim().length > 50) {
    errors.push('First name must not exceed 50 characters');
  }
  
  if (!data.last_name || typeof data.last_name !== 'string' || data.last_name.trim().length === 0) {
    errors.push('Last name is required');
  } else if (data.last_name.trim().length < 2) {
    errors.push('Last name must be at least 2 characters long');
  } else if (data.last_name.trim().length > 50) {
    errors.push('Last name must not exceed 50 characters');
  }
  
  if (!data.age || typeof data.age !== 'number' || data.age < 15 || data.age > 30) {
    errors.push('Age must be between 15 and 30');
  }
  
  if (!data.birth_date || typeof data.birth_date !== 'string' || data.birth_date.trim().length === 0) {
    errors.push('Birth date is required');
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.birth_date)) {
      errors.push('Birth date must be in YYYY-MM-DD format');
    } else {
      const birthDate = new Date(data.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 15 || age > 30) {
        errors.push('Age calculated from birth date must be between 15 and 30');
      }
    }
  }
  
  if (!data.gender || typeof data.gender !== 'string' || !['Male', 'Female'].includes(data.gender)) {
    errors.push('Gender must be Male or Female');
  }
  
  if (!data.contact_number || typeof data.contact_number !== 'string' || data.contact_number.trim().length === 0) {
    errors.push('Contact number is required');
  } else {
    // Basic phone number validation (Philippines format)
    const phoneRegex = /^(\+63|0)?[9]\d{9}$/;
    if (!phoneRegex.test(data.contact_number.replace(/\s/g, ''))) {
      errors.push('Please enter a valid Philippine mobile number');
    }
  }
  
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Please enter a valid email address');
    } else if (data.email.trim().length > 100) {
      errors.push('Email must not exceed 100 characters');
    }
  }
  
  if (!data.barangay_id || typeof data.barangay_id !== 'string' || data.barangay_id.trim().length === 0) {
    errors.push('Barangay is required');
  }
  
  // Optional fields validation
  if (data.middle_name && (typeof data.middle_name !== 'string' || data.middle_name.trim().length > 50)) {
    errors.push('Middle name must not exceed 50 characters');
  }
  
  if (data.suffix && (typeof data.suffix !== 'string' || data.suffix.trim().length > 10)) {
    errors.push('Suffix must not exceed 10 characters');
  }
  
  if (data.purok_zone && (typeof data.purok_zone !== 'string' || data.purok_zone.trim().length > 100)) {
    errors.push('Purok/Zone must not exceed 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 