import dataSubjectRightsService from '../services/dataSubjectRightsService.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * Create data subject rights request
 * POST /api/data-subject-rights/requests
 */
export const createRequest = async (req, res) => {
  try {
    const {
      requestType,
      requesterEmail,
      youthId,
      email,
      requestDescription,
      requestDetails,
    } = req.body;

    // Validate required fields
    if (!requestType || !requesterEmail || !requestDescription || !youthId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: requestType, requesterEmail, requestDescription, youthId',
      });
    }

    // Validate request type
    const validRequestTypes = [
      'access',
      'rectification',
      'erasure',
      'portability',
      'object',
      'consent_withdrawal',
    ];
    if (!validRequestTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}`,
      });
    }

    const result = await dataSubjectRightsService.createRequest(
      {
        requestType,
        requesterEmail,
        youthId,
        email: email || requesterEmail,
        requestDescription,
        requestDetails,
      },
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    if (result.success) {
      // Log request creation
      createAuditLog({
        userId: req.user?.id || 'anonymous',
        userType: req.user?.userType || 'anonymous',
        action: 'Create',
        resource: '/api/data-subject-rights/requests',
        resourceId: result.request.request_id.toString(),
        resourceName: `Data Subject Rights Request: ${requestType}`,
        details: {
          requestType,
          requesterEmail,
          requestId: result.request.request_id,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.status(201).json({
        success: true,
        message: 'Data subject rights request created successfully',
        data: {
          request: result.request,
          requestRef: result.requestRef,
          accessToken: result.accessToken, // Include token for immediate redirect
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create data subject rights request',
        error: result.message,
      });
    }
  } catch (error) {
    logger.error('Create data subject rights request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create data subject rights request',
      error: error.message,
    });
  }
};

/**
 * Get request by ID or access token
 * GET /api/data-subject-rights/requests/:id
 * GET /api/data-subject-rights/requests/by-token/:token (public)
 */
export const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    // If token is provided in query, use token-based access
    if (token) {
      const result = await dataSubjectRightsService.getRequestByToken(token);
      if (result.success) {
        return res.json({
          success: true,
          data: result.request,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    }

    // Otherwise, use ID-based access (requires authentication)
    const result = await dataSubjectRightsService.getRequest(id);

    if (result.success) {
      // Check if user has permission to view this request
      // Users can view their own requests, admins can view all
      if (req.user) {
        const isAdmin = req.user.userType === 'admin' || req.user.role === 'admin';
        const isOwnRequest = result.request.requester_email === req.user.email ||
                           result.request.youth_id && req.user.youthId === result.request.youth_id;

        if (!isAdmin && !isOwnRequest) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this request',
          });
        }
      }

      res.json({
        success: true,
        data: result.request,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Get request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get data subject rights request',
      error: error.message,
    });
  }
};

/**
 * Get request by access token (public endpoint)
 * GET /api/data-subject-rights/requests/by-token/:token
 */
export const getRequestByToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const result = await dataSubjectRightsService.getRequestByToken(token);

    if (result.success) {
      res.json({
        success: true,
        data: result.request,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Get request by token error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get data subject rights request',
      error: error.message,
    });
  }
};

/**
 * List requests
 * GET /api/data-subject-rights/requests
 */
export const listRequests = async (req, res) => {
  try {
    const filters = {
      requestType: req.query.requestType,
      requestStatus: req.query.requestStatus,
      youthId: req.query.youthId,
      email: req.query.email,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit, 10) || 100,
    };

    // Non-admin users can only see their own requests
    if (req.user && req.user.userType !== 'admin' && req.user.role !== 'admin') {
      filters.email = req.user.email;
      if (req.user.youthId) {
        filters.youthId = req.user.youthId;
      }
    }

    const result = await dataSubjectRightsService.listRequests(filters);

    res.json({
      success: true,
      data: result.requests,
      count: result.count,
    });
  } catch (error) {
    logger.error('List requests error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to list data subject rights requests',
      error: error.message,
    });
  }
};

/**
 * Update request status
 * PATCH /api/data-subject-rights/requests/:id/status
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await dataSubjectRightsService.updateRequestStatus(
      id,
      status,
      req.user?.id || 'SYSTEM',
      notes
    );

    if (result.success) {
      // Log status update
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Update',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: `Update Request Status: ${status}`,
        details: {
          status,
          notes,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: 'Request status updated successfully',
        data: result.request,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Update request status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update request status',
      error: error.message,
    });
  }
};

/**
 * Process access request
 * POST /api/data-subject-rights/requests/:id/process-access
 */
export const processAccessRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataSubjectRightsService.processAccessRequest(
      id,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Access Request',
        details: {
          requestType: 'access',
          processed: true,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: 'Access request processed successfully',
        data: result.userData,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process access request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process access request',
      error: error.message,
    });
  }
};

/**
 * Process rectification request
 * POST /api/data-subject-rights/requests/:id/process-rectification
 */
export const processRectificationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { corrections } = req.body;

    if (!corrections || Object.keys(corrections).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Corrections are required',
      });
    }

    const result = await dataSubjectRightsService.processRectificationRequest(
      id,
      corrections,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Rectification Request',
        details: {
          requestType: 'rectification',
          corrections,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process rectification request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process rectification request',
      error: error.message,
    });
  }
};

/**
 * Process erasure request
 * POST /api/data-subject-rights/requests/:id/process-erasure
 */
export const processErasureRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataSubjectRightsService.processErasureRequest(
      id,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Erasure Request',
        details: {
          requestType: 'erasure',
          processed: true,
          retentionDate: result.retentionDate,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: result.message,
        data: {
          retentionDate: result.retentionDate,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process erasure request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process erasure request',
      error: error.message,
    });
  }
};

/**
 * Process portability request
 * POST /api/data-subject-rights/requests/:id/process-portability
 */
export const processPortabilityRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataSubjectRightsService.processPortabilityRequest(
      id,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Portability Request',
        details: {
          requestType: 'portability',
          processed: true,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: 'Portability request processed successfully',
        data: result.exportData,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process portability request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process portability request',
      error: error.message,
    });
  }
};

/**
 * Process objection request
 * POST /api/data-subject-rights/requests/:id/process-objection
 */
export const processObjectionRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataSubjectRightsService.processObjectionRequest(
      id,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Objection Request',
        details: {
          requestType: 'object',
          processed: true,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process objection request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process objection request',
      error: error.message,
    });
  }
};

/**
 * Process consent withdrawal request
 * POST /api/data-subject-rights/requests/:id/process-consent-withdrawal
 */
export const processConsentWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataSubjectRightsService.processConsentWithdrawalRequest(
      id,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log processing
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Process',
        resource: '/api/data-subject-rights/requests',
        resourceId: id,
        resourceName: 'Process Consent Withdrawal Request',
        details: {
          requestType: 'consent_withdrawal',
          processed: true,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Process consent withdrawal request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process consent withdrawal request',
      error: error.message,
    });
  }
};

/**
 * Verify requester identity
 * POST /api/data-subject-rights/requests/:id/verify-identity
 */
export const verifyIdentity = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationMethod } = req.body;

    if (!verificationMethod) {
      return res.status(400).json({
        success: false,
        message: 'Verification method is required',
      });
    }

    const result = await dataSubjectRightsService.verifyIdentity(
      id,
      verificationMethod,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Identity verified successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Verify identity error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to verify identity',
      error: error.message,
    });
  }
};

/**
 * Assign request to staff member
 * POST /api/data-subject-rights/requests/:id/assign
 */
export const assignRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned to is required',
      });
    }

    const result = await dataSubjectRightsService.assignRequest(id, assignedTo);

    if (result.success) {
      res.json({
        success: true,
        message: 'Request assigned successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Assign request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to assign request',
      error: error.message,
    });
  }
};

/**
 * Get request statistics
 * GET /api/data-subject-rights/statistics
 */
export const getRequestStatistics = async (req, res) => {
  try {
    const result = await dataSubjectRightsService.getRequestStatistics();

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get request statistics error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get request statistics',
      error: error.message,
    });
  }
};

