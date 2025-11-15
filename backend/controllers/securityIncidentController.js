import securityIncidentService from '../services/securityIncidentService.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * Create security incident
 * POST /api/security-incidents
 */
export const createIncident = async (req, res) => {
  try {
    const {
      incidentType,
      severity,
      title,
      description,
      affectedSystems,
      affectedData,
      details,
    } = req.body;

    // Validate required fields
    if (!incidentType || !severity || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: incidentType, severity, title, description',
      });
    }

    const result = await securityIncidentService.createIncident(
      {
        incidentType,
        severity,
        title,
        description,
        affectedSystems,
        affectedData,
        details,
      },
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      // Log incident creation
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Create',
        resource: '/api/security-incidents',
        resourceId: result.incident.incident_id,
        resourceName: `Security Incident: ${title}`,
        details: {
          incidentType,
          severity,
          title,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.status(201).json({
        success: true,
        message: 'Security incident created successfully',
        data: result.incident,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create security incident',
        error: result.message,
      });
    }
  } catch (error) {
    logger.error('Create security incident error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create security incident',
      error: error.message,
    });
  }
};

/**
 * Get incident by ID
 * GET /api/security-incidents/:id
 */
export const getIncident = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await securityIncidentService.getIncident(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.incident,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Get incident error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get security incident',
      error: error.message,
    });
  }
};

/**
 * List incidents
 * GET /api/security-incidents
 */
export const listIncidents = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      severity: req.query.severity,
      incidentType: req.query.incidentType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit, 10) || 100,
    };

    const result = await securityIncidentService.listIncidents(filters);

    res.json({
      success: true,
      data: result.incidents,
      count: result.count,
    });
  } catch (error) {
    logger.error('List incidents error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to list security incidents',
      error: error.message,
    });
  }
};

/**
 * Update incident status
 * PATCH /api/security-incidents/:id/status
 */
export const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const result = await securityIncidentService.updateIncidentStatus(
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
        resource: '/api/security-incidents',
        resourceId: id,
        resourceName: `Update Incident Status: ${status}`,
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
        message: 'Incident status updated successfully',
        data: result.incident,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Update incident status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update incident status',
      error: error.message,
    });
  }
};

/**
 * Add incident update
 * POST /api/security-incidents/:id/updates
 */
export const addIncidentUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { update } = req.body;

    if (!update) {
      return res.status(400).json({
        success: false,
        message: 'Update is required',
      });
    }

    const result = await securityIncidentService.addIncidentUpdate(
      id,
      update,
      req.user?.id || 'SYSTEM'
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Incident update added successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add incident update',
        error: result.message,
      });
    }
  } catch (error) {
    logger.error('Add incident update error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to add incident update',
      error: error.message,
    });
  }
};

/**
 * Get incident statistics
 * GET /api/security-incidents/statistics
 */
export const getIncidentStatistics = async (req, res) => {
  try {
    const result = await securityIncidentService.getIncidentStatistics();

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get incident statistics error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get incident statistics',
      error: error.message,
    });
  }
};


