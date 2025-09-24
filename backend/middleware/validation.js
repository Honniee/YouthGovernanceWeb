import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Authentication Validations
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must be 2-50 characters and contain only letters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must be 2-50 characters and contain only letters'),
  body('middleName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Middle name must contain only letters'),
  handleValidationErrors
];

/**
 * User Management Validations
 */
export const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must be 2-50 characters and contain only letters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must be 2-50 characters and contain only letters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 8 characters and contain uppercase, lowercase, and number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Youth Registration Validations
 */
export const validateYouthRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must be 2-50 characters and contain only letters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must be 2-50 characters and contain only letters'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 15 || age > 30) {
        throw new Error('Age must be between 15 and 30 years old');
      }
      return true;
    }),
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('contactNumber')
    .matches(/^(\+63|0)[0-9]{10}$/)
    .withMessage('Please provide a valid Philippine contact number'),
  body('barangayId')
    .notEmpty()
    .withMessage('Barangay is required'),
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be 10-200 characters long'),
  handleValidationErrors
];

/**
 * Program/Event Validations
 */
export const validateProgram = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Program title must be 5-100 characters long'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Program description must be 20-1000 characters long'),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      
      if (startDate < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max participants must be between 1 and 1000'),
  body('location')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Location must be 5-200 characters long'),
  handleValidationErrors
];

/**
 * Parameter Validations
 */
export const validateUserId = [
  param('id')
    .matches(/^[A-Z]{2,5}\d{3,6}$/)
    .withMessage('Invalid user ID format'),
  handleValidationErrors
];

export const validateBarangayId = [
  param('barangayId')
    .matches(/^SJB\d{3}$/)
    .withMessage('Invalid barangay ID format'),
  handleValidationErrors
];

export const validateProgramId = [
  param('programId')
    .matches(/^PRG\d{3,6}$/)
    .withMessage('Invalid program ID format'),
  handleValidationErrors
];

/**
 * Query Parameter Validations
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be 2-50 characters long'),
  query('filter')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Filter must be active, inactive, or all'),
  handleValidationErrors
];

/**
 * File Upload Validations
 */
export const validateImageUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'No image file provided'
    });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
    });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({
      message: 'File too large. Maximum size is 5MB.'
    });
  }

  next();
};

export const validateDocumentUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'No document file provided'
    });
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      message: 'Invalid file type. Only PDF and Word documents are allowed.'
    });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({
      message: 'File too large. Maximum size is 10MB.'
    });
  }

  next();
}; 