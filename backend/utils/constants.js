// Application Constants

// User Types
export const USER_TYPES = {
  LYDO_STAFF: 'lydo_staff',
  SK_OFFICIAL: 'sk_official', 
  YOUTH: 'youth'
};

// User Roles  
export const ROLES = {
  ADMIN: 'admin',
  LYDO_STAFF: 'lydo_staff',
  SK_CHAIRPERSON: 'sk_chairperson',
  SK_SECRETARY: 'sk_secretary',
  SK_TREASURER: 'sk_treasurer',
  SK_COUNCILOR: 'sk_councilor'
};

// SK Positions
export const SK_POSITIONS = {
  CHAIRPERSON: 'SK Chairperson',
  SECRETARY: 'SK Secretary', 
  TREASURER: 'SK Treasurer',
  COUNCILOR: 'SK Councilor'
};

// Database Table Names
export const TABLES = {
  LYDO: 'LYDO',
  SK_OFFICIALS: 'SK_Officials',
  YOUTH_PROFILING: 'Youth_Profiling',
  BARANGAY: 'Barangay',
  ROLES: 'Roles',
  PROGRAMS: 'Programs',
  EVENTS: 'Events',
  ACTIVITY_LOGS: 'Activity_Logs'
};

// API Response Messages
export const MESSAGES = {
  // Success
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  UPDATE_SUCCESS: 'Update successful',
  DELETE_SUCCESS: 'Delete successful',
  
  // Errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  EMAIL_EXISTS: 'Email already registered',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  
  // Authentication
  TOKEN_REQUIRED: 'Access token is required',
  TOKEN_INVALID: 'Invalid access token',
  TOKEN_EXPIRED: 'Access token has expired',
  
  // File Upload
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_UPLOAD_ERROR: 'File upload failed'
};

// HTTP Status Codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  
  // Age limits for youth
  YOUTH_MIN_AGE: 15,
  YOUTH_MAX_AGE: 30,
  
  // File upload limits
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Regular Expressions
export const REGEX = {
  // Philippine mobile number
  PH_MOBILE: /^(\+63|0)[0-9]{10}$/,
  
  // ID Formats
  LYDO_ID: /^LYDO\d{3}$/,
  SK_ID: /^SK\d{3}$/,
  YOUTH_ID: /^YTH\d{3}$/,
  BARANGAY_ID: /^SJB\d{3}$/,
  PROGRAM_ID: /^PRG\d{3,6}$/,
  
  // Names (letters, spaces, some special characters)
  NAME: /^[a-zA-Z\s\u00C0-\u017F'-]{2,50}$/,
  
  // Password strength
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
};

// File Types
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_VERIFICATION: 'account_verification',
  PROGRAM_INVITATION: 'program_invitation',
  EVENT_REMINDER: 'event_reminder'
};

// Activity Log Actions
export const ACTIVITY_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  DOWNLOAD: 'download',
  UPLOAD: 'upload'
};

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile_',
  BARANGAY_LIST: 'barangay_list',
  PROGRAM_LIST: 'program_list_',
  SK_OFFICIALS: 'sk_officials_'
};

// Cache Duration (in seconds)
export const CACHE_DURATION = {
  SHORT: 300,    // 5 minutes
  MEDIUM: 1800,  // 30 minutes
  LONG: 3600,    // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Default Values
export const DEFAULTS = {
  PAGINATION_LIMIT: 20,
  SORT_ORDER: 'desc',
  SORT_BY: 'createdAt',
  TIMEZONE: 'Asia/Manila'
};

// Environment Variables Keys
export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  DATABASE_URL: 'DATABASE_URL',
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
  SMTP_HOST: 'SMTP_HOST',
  SMTP_PORT: 'SMTP_PORT',
  SMTP_USER: 'SMTP_USER',
  SMTP_PASS: 'SMTP_PASS'
}; 