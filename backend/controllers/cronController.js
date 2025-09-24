import skTermsAutoUpdateService from '../services/skTermsAutoUpdateService.js';

/**
 * Cron Job Controller
 * Handles automated tasks and scheduled operations
 */

/**
 * Daily automatic SK terms status update
 * This endpoint should be called by a cron job daily at midnight
 * GET /api/cron/update-term-statuses
 */
const updateTermStatuses = async (req, res) => {
  try {
    console.log('🕐 Cron job triggered: Update SK Term Statuses');
    
    // Verify this is a legitimate cron job request
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized cron job request'
      });
    }
    
    const result = await skTermsAutoUpdateService.updateTermStatuses();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Term statuses updated successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update term statuses',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during cron job execution',
      error: error.message
    });
  }
};

/**
 * Manual trigger for term status updates (for testing)
 * GET /api/cron/manual-update-term-statuses
 */
const manualUpdateTermStatuses = async (req, res) => {
  try {
    console.log('🔧 Manual cron job triggered: Update SK Term Statuses');
    
    const result = await skTermsAutoUpdateService.triggerManualUpdate();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Manual term status update completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update term statuses manually',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Manual cron job error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during manual cron job execution',
      error: error.message
    });
  }
};

/**
 * Get pending status updates (for monitoring)
 * GET /api/cron/pending-status-updates
 */
const getPendingStatusUpdates = async (req, res) => {
  try {
    const pendingUpdates = await skTermsAutoUpdateService.getPendingStatusUpdates();
    
    res.json({
      success: true,
      data: {
        pendingUpdates,
        count: pendingUpdates.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting pending status updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending status updates',
      error: error.message
    });
  }
};

export {
  updateTermStatuses,
  manualUpdateTermStatuses,
  getPendingStatusUpdates
};
