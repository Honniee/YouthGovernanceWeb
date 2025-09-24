import { body, query, param, validationResult } from 'express-validator';
import SurveyBatchesService from '../services/surveyBatchesService.js';

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Validation rules for creating a survey batch
 */
export const validateBatchCreation = [
  body('batchName')
    .notEmpty()
    .withMessage('Batch name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Batch name must be between 3 and 100 characters')
    .trim()
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim()
    .escape(),
  
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  body('targetAgeMin')
    .optional()
    .isInt({ min: 15, max: 30 })
    .withMessage('Minimum age must be between 15 and 30')
    .toInt(),
  
  body('targetAgeMax')
    .optional()
    .isInt({ min: 15, max: 30 })
    .withMessage('Maximum age must be between 15 and 30')
    .toInt()
    .custom((value, { req }) => {
      if (req.body.targetAgeMin && value) {
        if (value <= req.body.targetAgeMin) {
          throw new Error('Maximum age must be greater than minimum age');
        }
      }
      return true;
    }),
];

/**
 * Validation rules for updating a survey batch
 */
export const validateBatchUpdate = [
  param('id')
    .notEmpty()
    .withMessage('Batch ID is required')
    .matches(/^BAT\d{3}$/)
    .withMessage('Invalid batch ID format'),
  
  body('batchName')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Batch name must be between 3 and 100 characters')
    .trim()
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim()
    .escape(),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  body('targetAgeMin')
    .optional()
    .isInt({ min: 15, max: 30 })
    .withMessage('Minimum age must be between 15 and 30')
    .toInt(),
  
  body('targetAgeMax')
    .optional()
    .isInt({ min: 15, max: 30 })
    .withMessage('Maximum age must be between 15 and 30')
    .toInt()
    .custom((value, { req }) => {
      if (req.body.targetAgeMin && value) {
        if (value <= req.body.targetAgeMin) {
          throw new Error('Maximum age must be greater than minimum age');
        }
      }
      return true;
    }),
];

/**
 * Validation rules for status updates
 */
export const validateStatusUpdate = [
  param('id')
    .notEmpty()
    .withMessage('Batch ID is required')
    .matches(/^BAT\d{3}$/)
    .withMessage('Invalid batch ID format'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(SurveyBatchesService.VALID_STATUSES)
    .withMessage(`Status must be one of: ${SurveyBatchesService.VALID_STATUSES.join(', ')}`),
  
  body('action')
    .optional()
    .isIn(['activate', 'pause', 'resume', 'close', 'force-activate', 'force-close'])
    .withMessage('Invalid action'),
  
  body('reason')
    .optional()
    .isLength({ min: 3, max: 500 })
    .withMessage('Reason must be between 3 and 500 characters')
    .trim()
    .escape()
    .custom((value, { req }) => {
      // Require reason only for pause; force actions no longer need a reason
      if (req.body.action === 'pause' && !value?.trim()) {
        throw new Error('Reason is required for pause action');
      }
      return true;
    }),
];

/**
 * Validation rules for query parameters
 */
export const validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
    .toInt(),
  
  query('status')
    .optional()
    .isIn(SurveyBatchesService.VALID_STATUSES)
    .withMessage(`Status must be one of: ${SurveyBatchesService.VALID_STATUSES.join(', ')}`),
  
  query('sortBy')
    .optional()
    .isIn(SurveyBatchesService.VALID_SORT_FIELDS)
    .withMessage(`Sort field must be one of: ${SurveyBatchesService.VALID_SORT_FIELDS.join(', ')}`),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters')
    .trim()
    .escape(),
  
  query('includeStats')
    .optional()
    .isBoolean()
    .withMessage('includeStats must be a boolean')
    .toBoolean(),
];

/**
 * Validation rules for business rules check
 */
export const validateBusinessRulesCheck = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  query('excludeBatchId')
    .optional()
    .matches(/^BAT\d{3}$/)
    .withMessage('Invalid batch ID format'),
];

/**
 * Validation rules for bulk operations
 */
export const validateBulkOperation = [
  body('batchIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Batch IDs must be an array with 1-50 items')
    .custom((batchIds) => {
      const validFormat = /^BAT\d{3}$/;
      const invalidIds = batchIds.filter(id => !validFormat.test(id));
      if (invalidIds.length > 0) {
        throw new Error(`Invalid batch ID format: ${invalidIds.join(', ')}`);
      }
      return true;
    }),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(SurveyBatchesService.VALID_STATUSES)
    .withMessage(`Status must be one of: ${SurveyBatchesService.VALID_STATUSES.join(', ')}`),
  
  body('reason')
    .optional()
    .isLength({ min: 3, max: 500 })
    .withMessage('Reason must be between 3 and 500 characters')
    .trim()
    .escape(),
];

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Express middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

// =============================================================================
// BUSINESS LOGIC VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Middleware to check KK survey business rules during creation
 */
export const validateKKSurveyRules = async (req, res, next) => {
  try {
    const { batchName } = req.body;
    
    // Check if this is a KK survey
    if (SurveyBatchesService.isKKSurveyName(batchName)) {
      const activeKK = await SurveyBatchesService.checkActiveKKSurvey();
      
      if (activeKK.hasActiveKK) {
        const activeNames = activeKK.activeBatches.map(b => b.batch_name).join(', ');
        return res.status(400).json({
          success: false,
          message: `Only one active Katipunan ng Kabataan survey is allowed at a time. Currently active: ${activeNames}`
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check date conflicts during creation/update
 */
export const validateDateConflicts = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    const excludeBatchId = req.params.id; // For updates
    
    if (startDate && endDate) {
      const conflicts = await SurveyBatchesService.checkDateConflicts(
        startDate, 
        endDate, 
        excludeBatchId
      );
      
      if (conflicts.hasConflicts) {
        const conflictNames = conflicts.conflicts.map(c => c.batch_name).join(', ');
        return res.status(400).json({
          success: false,
          message: `Date conflicts with existing surveys: ${conflictNames}`,
          conflicts: conflicts.conflicts
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// COMBINED VALIDATION CHAINS
// =============================================================================

/**
 * Complete validation chain for batch creation
 */
export const validateCreateBatch = [
  ...validateBatchCreation,
  handleValidationErrors,
  validateKKSurveyRules,
  validateDateConflicts
];

/**
 * Complete validation chain for batch updates
 */
export const validateUpdateBatch = [
  ...validateBatchUpdate,
  handleValidationErrors,
  validateDateConflicts
];

/**
 * Complete validation chain for status updates
 */
export const validateUpdateStatus = [
  ...validateStatusUpdate,
  handleValidationErrors
];

/**
 * Complete validation chain for query parameters
 */
export const validateQuery = [
  ...validateQueryParams,
  handleValidationErrors
];

/**
 * Complete validation chain for business rules check
 */
export const validateBusinessRules = [
  ...validateBusinessRulesCheck,
  handleValidationErrors
];

/**
 * Complete validation chain for bulk operations
 */
export const validateBulkOp = [
  ...validateBulkOperation,
  handleValidationErrors
];



