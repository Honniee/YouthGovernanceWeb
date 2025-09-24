import { getClient } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get home page statistics (public endpoint)
 * @desc Get key statistics for the home page including youth, programs, barangays, and events
 * @access Public
 */
export const getHomePageStatistics = async (req, res) => {
  const client = await getClient();
  
  try {
    // Get all statistics in parallel for better performance
    const [
      activeYouthCount,
      totalBarangaysCount,
      featuredProgramsCount,
      eventsThisMonthCount
    ] = await Promise.all([
      getActiveYouthCount(client),
      getTotalBarangaysCount(client),
      getFeaturedProgramsCount(client),
      getEventsThisMonthCount(client)
    ]);

    const statistics = {
      activeYouth: activeYouthCount,
      totalBarangays: totalBarangaysCount,
      featuredPrograms: featuredProgramsCount,
      eventsThisMonth: eventsThisMonthCount,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: statistics,
      message: 'Statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching home page statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get count of active youth members
 */
const getActiveYouthCount = async (client) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM "Youth_Profiling" 
      WHERE is_active = true
    `);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    logger.error('Error counting active youth:', error);
    return 0;
  }
};

/**
 * Get total number of barangays
 */
const getTotalBarangaysCount = async (client) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM "Barangay"
    `);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    logger.error('Error counting barangays:', error);
    return 0;
  }
};

/**
 * Get count of featured programs (published programs, projects, activities)
 */
const getFeaturedProgramsCount = async (client) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM "Announcements" 
      WHERE category IN ('programs', 'projects', 'activities') 
        AND status = 'published'
    `);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    logger.error('Error counting featured programs:', error);
    return 0;
  }
};

/**
 * Get count of events this month (based on event_date, not published_at)
 */
const getEventsThisMonthCount = async (client) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM "Announcements" 
      WHERE event_date >= DATE_TRUNC('month', CURRENT_DATE) 
        AND event_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        AND status = 'published'
        AND event_date IS NOT NULL
    `);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    logger.error('Error counting events this month:', error);
    return 0;
  }
};

/**
 * Get detailed statistics for admin dashboard
 * @desc Get comprehensive statistics for admin dashboard
 * @access Admin only
 */
export const getAdminDashboardStatistics = async (req, res) => {
  const client = await getClient();
  
  try {
    // Get comprehensive statistics in parallel
    const [
      youthStats,
      announcementStats,
      surveyStats,
      barangayStats
    ] = await Promise.all([
      getYouthStatistics(client),
      getAnnouncementStatistics(client),
      getSurveyStatistics(client),
      getBarangayStatistics(client)
    ]);

    const statistics = {
      youth: youthStats,
      announcements: announcementStats,
      surveys: surveyStats,
      barangays: barangayStats,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: statistics,
      message: 'Admin dashboard statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching admin dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    client.release();
  }
};

/**
 * Get youth statistics
 */
const getYouthStatistics = async (client) => {
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
        COUNT(*) as total_count
      FROM "Youth_Profiling"
    `);
    return result.rows[0] || { active_count: 0, inactive_count: 0, total_count: 0 };
  } catch (error) {
    logger.error('Error getting youth statistics:', error);
    return { active_count: 0, inactive_count: 0, total_count: 0 };
  }
};

/**
 * Get announcement statistics
 */
const getAnnouncementStatistics = async (client) => {
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE category = 'programs') as programs_count,
        COUNT(*) FILTER (WHERE category = 'projects') as projects_count,
        COUNT(*) FILTER (WHERE category = 'activities') as activities_count,
        COUNT(*) as total_count
      FROM "Announcements"
    `);
    return result.rows[0] || { 
      published_count: 0, 
      draft_count: 0, 
      programs_count: 0, 
      projects_count: 0, 
      activities_count: 0, 
      total_count: 0 
    };
  } catch (error) {
    logger.error('Error getting announcement statistics:', error);
    return { 
      published_count: 0, 
      draft_count: 0, 
      programs_count: 0, 
      projects_count: 0, 
      activities_count: 0, 
      total_count: 0 
    };
  }
};

/**
 * Get survey statistics
 */
const getSurveyStatistics = async (client) => {
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) as total_count
      FROM "KK_Survey_Batches"
    `);
    return result.rows[0] || { active_count: 0, closed_count: 0, draft_count: 0, total_count: 0 };
  } catch (error) {
    logger.error('Error getting survey statistics:', error);
    return { active_count: 0, closed_count: 0, draft_count: 0, total_count: 0 };
  }
};

/**
 * Get barangay statistics
 */
const getBarangayStatistics = async (client) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as total_count
      FROM "Barangay"
    `);
    return { total_count: parseInt(result.rows[0].total_count) || 0 };
  } catch (error) {
    logger.error('Error getting barangay statistics:', error);
    return { total_count: 0 };
  }
};
