import { query } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import activityLogService from '../services/activityLogService.js';
import notificationService from '../services/notificationService.js';

/**
 * Announcements Controller
 * Handles CRUD operations for announcements management
 */

// Get all announcements with filtering and pagination
export const getAllAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = 'published_at',
      sortOrder = 'DESC',
      is_featured,
      is_pinned
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(title ILIKE $${paramCount} OR content ILIKE $${paramCount} OR summary ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (is_featured !== undefined) {
      paramCount++;
      whereConditions.push(`is_featured = $${paramCount}`);
      queryParams.push(is_featured === 'true');
    }

    if (is_pinned !== undefined) {
      paramCount++;
      whereConditions.push(`is_pinned = $${paramCount}`);
      queryParams.push(is_pinned === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['created_at', 'updated_at', 'published_at', 'title', 'category'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Announcements"
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get announcements with creator info
    const announcementsQuery = `
      SELECT 
        a.*,
        u.user_type,
        CASE 
          WHEN u.user_type = 'admin' THEN l.first_name || ' ' || l.last_name
          WHEN u.user_type = 'lydo_staff' THEN l.first_name || ' ' || l.last_name
          WHEN u.user_type = 'sk_official' THEN sk.first_name || ' ' || sk.last_name
          ELSE 'Unknown'
        END as creator_name
      FROM "Announcements" a
      LEFT JOIN "Users" u ON a.created_by = u.user_id
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
      LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
      ${whereClause}
      ORDER BY 
        a.is_pinned DESC,
        a.is_featured DESC,
        a.${sortField} ${sortDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await query(announcementsQuery, queryParams);

    const announcements = result.rows.map(row => ({
      ...row,
      published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    }));

    res.json({
      success: true,
      data: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

// Get announcement by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcementQuery = `
      SELECT 
        a.*,
        u.user_type,
        CASE 
          WHEN u.user_type = 'admin' THEN l.first_name || ' ' || l.last_name
          WHEN u.user_type = 'lydo_staff' THEN l.first_name || ' ' || l.last_name
          WHEN u.user_type = 'sk_official' THEN sk.first_name || ' ' || sk.last_name
          ELSE 'Unknown'
        END as creator_name
      FROM "Announcements" a
      LEFT JOIN "Users" u ON a.created_by = u.user_id
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
      LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
      WHERE a.announcement_id = $1
    `;

    const result = await query(announcementQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const announcement = {
      ...result.rows[0],
      published_at: result.rows[0].published_at ? new Date(result.rows[0].published_at).toISOString() : null,
      created_at: new Date(result.rows[0].created_at).toISOString(),
      updated_at: new Date(result.rows[0].updated_at).toISOString()
    };

    res.json({
      success: true,
      data: announcement
    });

  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
      error: error.message
    });
  }
};

// Create new announcement
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      category = 'general',
      status = 'draft',
      image_url,
      attachment_name,
      attachment_url,
      is_featured = false,
      is_pinned = false,
      published_at
    } = req.body;

    const announcement_id = generateId('ANN');
    const created_by = req.user.user_id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Validate category
    const validCategories = ['general', 'event', 'survey', 'meeting', 'deadline', 'achievement', 'update'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Validate status
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Set published_at if status is published and no published_at provided
    let finalPublishedAt = published_at;
    if (status === 'published' && !published_at) {
      finalPublishedAt = new Date().toISOString();
    }

    const query = `
      INSERT INTO "Announcements" (
        announcement_id, title, content, summary, category, status,
        image_url, attachment_name, attachment_url, is_featured, is_pinned,
        published_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      announcement_id, title, content, summary, category, status,
      image_url, attachment_name, attachment_url, is_featured, is_pinned,
      finalPublishedAt, created_by
    ];

    const result = await query(query, values);
    const announcement = result.rows[0];

    // Log activity
    await activityLogService.logActivity({
      user_id: created_by,
      user_type: req.user.user_type,
      action: 'create',
      resource_type: 'announcement',
      resource_id: announcement_id,
      resource_name: title,
      details: { category, status },
      category: 'Announcement'
    });

    // Send notification if published
    if (status === 'published') {
      await notificationService.createNotification({
        user_type: 'all',
        title: 'New Announcement',
        message: title,
        type: 'announcement',
        priority: is_featured ? 'high' : 'normal',
        created_by: created_by
      });
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        ...announcement,
        published_at: announcement.published_at ? new Date(announcement.published_at).toISOString() : null,
        created_at: new Date(announcement.created_at).toISOString(),
        updated_at: new Date(announcement.updated_at).toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

// Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      summary,
      category,
      status,
      image_url,
      attachment_name,
      attachment_url,
      is_featured,
      is_pinned,
      published_at
    } = req.body;

    // Get current announcement
    const currentQuery = 'SELECT * FROM "Announcements" WHERE announcement_id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const currentAnnouncement = currentResult.rows[0];

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
    }

    if (content !== undefined) {
      paramCount++;
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
    }

    if (summary !== undefined) {
      paramCount++;
      updateFields.push(`summary = $${paramCount}`);
      values.push(summary);
    }

    if (category !== undefined) {
      const validCategories = ['general', 'event', 'survey', 'meeting', 'deadline', 'achievement', 'update'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
      paramCount++;
      updateFields.push(`category = $${paramCount}`);
      values.push(category);
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (image_url !== undefined) {
      paramCount++;
      updateFields.push(`image_url = $${paramCount}`);
      values.push(image_url);
    }

    if (attachment_name !== undefined) {
      paramCount++;
      updateFields.push(`attachment_name = $${paramCount}`);
      values.push(attachment_name);
    }

    if (attachment_url !== undefined) {
      paramCount++;
      updateFields.push(`attachment_url = $${paramCount}`);
      values.push(attachment_url);
    }

    if (is_featured !== undefined) {
      paramCount++;
      updateFields.push(`is_featured = $${paramCount}`);
      values.push(is_featured);
    }

    if (is_pinned !== undefined) {
      paramCount++;
      updateFields.push(`is_pinned = $${paramCount}`);
      values.push(is_pinned);
    }

    if (published_at !== undefined) {
      paramCount++;
      updateFields.push(`published_at = $${paramCount}`);
      values.push(published_at);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Handle status change to published
    if (status === 'published' && currentAnnouncement.status !== 'published') {
      paramCount++;
      updateFields.push(`published_at = $${paramCount}`);
      values.push(new Date().toISOString());
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE "Announcements" 
      SET ${updateFields.join(', ')}
      WHERE announcement_id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);
    const announcement = result.rows[0];

    // Log activity
    await activityLogService.logActivity({
      user_id: req.user.user_id,
      user_type: req.user.user_type,
      action: 'update',
      resource_type: 'announcement',
      resource_id: id,
      resource_name: announcement.title,
      details: { 
        changes: updateFields,
        previous_status: currentAnnouncement.status,
        new_status: status || currentAnnouncement.status
      },
      category: 'Announcement'
    });

    // Send notification if status changed to published
    if (status === 'published' && currentAnnouncement.status !== 'published') {
      await notificationService.createNotification({
        user_type: 'all',
        title: 'Announcement Updated',
        message: announcement.title,
        type: 'announcement',
        priority: announcement.is_featured ? 'high' : 'normal',
        created_by: req.user.user_id
      });
    }

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: {
        ...announcement,
        published_at: announcement.published_at ? new Date(announcement.published_at).toISOString() : null,
        created_at: new Date(announcement.created_at).toISOString(),
        updated_at: new Date(announcement.updated_at).toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: error.message
    });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // Get announcement details for logging
    const getQuery = 'SELECT title FROM "Announcements" WHERE announcement_id = $1';
    const getResult = await query(getQuery, [id]);

    if (getResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const deleteQuery = 'DELETE FROM "Announcements" WHERE announcement_id = $1';
    await query(deleteQuery, [id]);

    // Log activity
    await activityLogService.logActivity({
      user_id: req.user.user_id,
      user_type: req.user.user_type,
      action: 'delete',
      resource_type: 'announcement',
      resource_id: id,
      resource_name: getResult.rows[0].title,
      details: { deleted_at: new Date().toISOString() },
      category: 'Announcement'
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
};

// Get announcement statistics
export const getAnnouncementStatistics = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_announcements,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_count,
        COUNT(CASE WHEN is_pinned = true THEN 1 END) as pinned_count,
        COUNT(CASE WHEN category = 'general' THEN 1 END) as general_count,
        COUNT(CASE WHEN category = 'event' THEN 1 END) as event_count,
        COUNT(CASE WHEN category = 'survey' THEN 1 END) as survey_count,
        COUNT(CASE WHEN category = 'meeting' THEN 1 END) as meeting_count,
        COUNT(CASE WHEN category = 'deadline' THEN 1 END) as deadline_count,
        COUNT(CASE WHEN category = 'achievement' THEN 1 END) as achievement_count,
        COUNT(CASE WHEN category = 'update' THEN 1 END) as update_count
      FROM "Announcements"
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total_announcements),
        by_status: {
          published: parseInt(stats.published_count),
          draft: parseInt(stats.draft_count),
          archived: parseInt(stats.archived_count)
        },
        by_feature: {
          featured: parseInt(stats.featured_count),
          pinned: parseInt(stats.pinned_count)
        },
        by_category: {
          general: parseInt(stats.general_count),
          event: parseInt(stats.event_count),
          survey: parseInt(stats.survey_count),
          meeting: parseInt(stats.meeting_count),
          deadline: parseInt(stats.deadline_count),
          achievement: parseInt(stats.achievement_count),
          update: parseInt(stats.update_count)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching announcement statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement statistics',
      error: error.message
    });
  }
};

// Bulk update announcement status
export const bulkUpdateAnnouncementStatus = async (req, res) => {
  try {
    const { announcement_ids, status } = req.body;

    if (!announcement_ids || !Array.isArray(announcement_ids) || announcement_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'announcement_ids array is required'
      });
    }

    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const placeholders = announcement_ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      UPDATE "Announcements" 
      SET status = $${announcement_ids.length + 1},
          updated_at = CURRENT_TIMESTAMP,
          published_at = CASE 
            WHEN $${announcement_ids.length + 1} = 'published' AND published_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE published_at 
          END
      WHERE announcement_id IN (${placeholders})
      RETURNING announcement_id, title, status
    `;

    const values = [...announcement_ids, status];
    const result = await query(query, values);

    // Log activity for each updated announcement
    for (const announcement of result.rows) {
      await activityLogService.logActivity({
        user_id: req.user.user_id,
        user_type: req.user.user_type,
        action: 'bulk_update_status',
        resource_type: 'announcement',
        resource_id: announcement.announcement_id,
        resource_name: announcement.title,
        details: { new_status: status, bulk_operation: true },
        category: 'Announcement'
      });
    }

    res.json({
      success: true,
      message: `Successfully updated ${result.rows.length} announcements`,
      data: result.rows
    });

  } catch (error) {
    console.error('Error bulk updating announcement status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update announcement status',
      error: error.message
    });
  }
};
