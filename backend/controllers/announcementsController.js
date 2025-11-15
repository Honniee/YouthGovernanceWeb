import { query } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import activityLogService from '../services/activityLogService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import notificationService from '../services/notificationService.js';
import { emitToRole, emitBroadcast } from '../services/realtime.js';
import logger from '../utils/logger.js';

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
      is_pinned,
      date_from,
      date_to
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

    // Date range filtering
    if (date_from) {
      paramCount++;
      whereConditions.push(`published_at >= $${paramCount}`);
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      whereConditions.push(`published_at <= $${paramCount}`);
      queryParams.push(date_to);
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
    logger.error('Error fetching announcements', { error: error.message, stack: error.stack });
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
    logger.error('Error fetching announcement', { error: error.message, stack: error.stack, announcementId: req.params.id });
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
    logger.debug('Creating announcement', { userId: req.user?.id, userType: req.user?.userType, hasBody: !!req.body });
    
    const {
      title,
      content,
      summary,
      category = 'programs',
      status = 'draft',
      image_url,
      attachment_name,
      attachment_url,
      is_featured = false,
      is_pinned = false,
      published_at,
      event_date,
      end_date,
      location
    } = req.body;

    // Generate a unique announcement ID with retry logic
    let announcement_id;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      try {
        announcement_id = await generateId('ANN');
        
        // Check if the ID already exists
        const checkQuery = 'SELECT announcement_id FROM "Announcements" WHERE announcement_id = $1';
        const checkResult = await query(checkQuery, [announcement_id]);
        
        if (checkResult.rows.length === 0) {
          // ID is unique, break out of loop
          break;
        } else {
          logger.warn('Generated ID already exists, retrying', { announcement_id, attempts });
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique announcement ID after multiple attempts');
          }
        }
      } catch (error) {
        logger.error('Error generating announcement ID', { error: error.message, stack: error.stack });
        throw error;
      }
    } while (attempts < maxAttempts);
    
    // Get the corresponding user_id from the Users table
    let created_by;
    try {
      const userLookupQuery = `
        SELECT user_id FROM "Users" 
        WHERE (lydo_id = $1 OR sk_id = $1 OR youth_id = $1) 
        AND user_type = $2
      `;
      const userResult = await query(userLookupQuery, [req.user.id, req.user.userType]);
      
      if (userResult.rows.length > 0) {
        created_by = userResult.rows[0].user_id;
        logger.debug('Found user_id in Users table', { user_id: created_by, lydo_id: req.user?.id });
      } else {
        logger.error('No corresponding user_id found in Users table', { lydo_id: req.user?.id, userType: req.user?.userType });
        return res.status(400).json({
          success: false,
          message: 'User not found in system'
        });
      }
    } catch (userError) {
      logger.error('Error looking up user_id', { error: userError.message, stack: userError.stack, lydo_id: req.user?.id });
      return res.status(500).json({
        success: false,
        message: 'Error validating user'
      });
    }
    
    logger.debug('Announcement ID generated', { announcement_id, created_by });

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Validate category (optional - database allows any text)
    // No strict validation needed since database doesn't have CHECK constraint

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

    // Normalize date-only fields for DATE columns
    const finalEventDate = event_date ? new Date(event_date).toISOString().slice(0, 10) : null;
    const finalEndDate = end_date ? new Date(end_date).toISOString().slice(0, 10) : null;

    // Handle image upload if present
    let finalImageUrl = image_url;
    if (req.file) {
      try {
        logger.debug('Processing uploaded image', { filename: req.file.originalname, announcement_id });
        
        // Import required modules for image processing
        const sharp = (await import('sharp')).default;
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        
        // Create announcements directory if it doesn't exist
        const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
        const announcementsDir = path.join(uploadsBase, 'announcements');
        try { fs.mkdirSync(announcementsDir, { recursive: true }); } catch {}
        
        // Generate unique filename
        const fileExtension = req.file.mimetype.split('/')[1] || 'jpg';
        const fileName = `${announcement_id}.${fileExtension}`;
        const targetPath = path.join(announcementsDir, fileName);
        
        // Process image with sharp (resize and optimize)
        const image = sharp(req.file.buffer).rotate();
        const metadata = await image.metadata();
        
        // Resize to reasonable dimensions (max 1200px width, maintain aspect ratio)
        const maxWidth = 1200;
        const maxHeight = 800;
        
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          await image.resize(maxWidth, maxHeight, { 
            fit: 'inside',
            withoutEnlargement: true 
          }).jpeg({ quality: 85 }).toFile(targetPath);
        } else {
          await image.jpeg({ quality: 85 }).toFile(targetPath);
        }
        
        // Set the image URL for database storage
        finalImageUrl = `/uploads/announcements/${fileName}`;
        logger.debug('Image processed and saved', { imageUrl: finalImageUrl, announcement_id });
        
      } catch (imageError) {
        logger.error('Image processing error', { error: imageError.message, stack: imageError.stack, announcement_id, filename: req.file?.originalname });
        // Continue without image if processing fails
        finalImageUrl = null;
        // Log the error but don't fail the entire request
        logger.warn('Image processing failed, continuing without image', { announcement_id });
      }
    }

    const sqlQuery = `
      INSERT INTO "Announcements" (
        announcement_id, title, content, summary, category, status,
        image_url, attachment_name, attachment_url, is_featured, is_pinned,
        published_at, created_by, location, event_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      announcement_id, title, content, summary, category, status,
      finalImageUrl, attachment_name, attachment_url, is_featured, is_pinned,
      finalPublishedAt, created_by, location || null, finalEventDate, finalEndDate
    ];

    logger.debug('Executing SQL query for announcement', { announcement_id, hasImage: !!finalImageUrl });
    let announcement;
    try {
      const result = await query(sqlQuery, values);
      logger.debug('Database query successful', { announcement_id });
      announcement = result.rows[0];
    } catch (dbError) {
      logger.error('Database error creating announcement', { error: dbError.message, stack: dbError.stack, announcement_id });
      throw dbError;
    }

    // Audit log
    try {
      await createAuditLog({
        userId: req.user?.id || created_by,
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Create',
        resource: '/api/announcements',
        resourceId: announcement_id,
        resourceName: title,
        resourceType: 'announcements',
        category: 'Announcement Management',
        details: { category, status },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (activityError) {
      logger.error('Error logging activity', { error: activityError.message, stack: activityError.stack, announcement_id });
    }

    // Send notification if published
    if (status === 'published') {
      try {
      await notificationService.createNotification({
        user_type: 'all',
        title: 'New Announcement',
        message: title,
        type: 'announcement',
        priority: is_featured ? 'high' : 'normal',
        created_by: created_by
      });
        logger.debug('Notification sent successfully', { announcement_id, userId: req.user?.id });
      } catch (notificationError) {
        logger.error('Error sending notification', { error: notificationError.message, stack: notificationError.stack, announcement_id });
      }
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

  // Realtime notify admin/staff and public
  try {
    const payload = { type: 'created', item: { announcement_id, title, status } };
    emitToRole('admin', 'announcement:changed', payload);
    emitToRole('lydo_staff', 'announcement:changed', payload);
    emitBroadcast('announcement:changed', payload);
  } catch (_) {}

  } catch (error) {
    logger.error('Error creating announcement', { 
      error: error.message, 
      stack: error.stack, 
      code: error.code, 
      detail: error.detail, 
      hint: error.hint,
      userId: req.user?.id 
    });
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
      published_at,
      event_date,
      end_date,
      location
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

    // Handle image upload if present
    let finalImageUrl = image_url;
    if (req.file) {
      try {
        logger.debug('Processing uploaded image for update', { filename: req.file.originalname, announcement_id: id });
        
        // Import required modules for image processing
        const sharp = (await import('sharp')).default;
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        
        // Create announcements directory if it doesn't exist
        const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
        const announcementsDir = path.join(uploadsBase, 'announcements');
        try { fs.mkdirSync(announcementsDir, { recursive: true }); } catch {}
        
        // Generate unique filename
        const fileExtension = req.file.mimetype.split('/')[1] || 'jpg';
        const fileName = `${id}.${fileExtension}`;
        const targetPath = path.join(announcementsDir, fileName);
        
        // Process image with sharp (resize and optimize)
        const image = sharp(req.file.buffer).rotate();
        const metadata = await image.metadata();
        
        // Resize to reasonable dimensions (max 1200px width, maintain aspect ratio)
        const maxWidth = 1200;
        const maxHeight = 800;
        
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          await image.resize(maxWidth, maxHeight, { 
            fit: 'inside',
            withoutEnlargement: true 
          }).jpeg({ quality: 85 }).toFile(targetPath);
        } else {
          await image.jpeg({ quality: 85 }).toFile(targetPath);
        }
        
        // Set the image URL for database storage
        finalImageUrl = `/uploads/announcements/${fileName}`;
        logger.debug('Image processed and saved', { imageUrl: finalImageUrl, announcement_id: id });
        
      } catch (imageError) {
        logger.error('Image processing error', { error: imageError.message, stack: imageError.stack, announcement_id: id });
        // Continue without image if processing fails
        finalImageUrl = image_url;
        logger.warn('Image processing failed, keeping existing image', { announcement_id: id });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    if (title !== undefined && title !== null) {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
    }

    if (content !== undefined && content !== null) {
      paramCount++;
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
    }

    if (summary !== undefined && summary !== null) {
      paramCount++;
      updateFields.push(`summary = $${paramCount}`);
      values.push(summary);
    }

    if (category !== undefined && category !== null) {
      const validCategories = ['projects', 'programs', 'activities', 'meetings', 'achievement', 'announcements'];
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

    if (req.file || (image_url !== undefined && image_url !== null)) {
      paramCount++;
      updateFields.push(`image_url = $${paramCount}`);
      values.push(finalImageUrl);
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

    if (is_featured !== undefined && is_featured !== null) {
      paramCount++;
      updateFields.push(`is_featured = $${paramCount}`);
      values.push(is_featured);
    }

    if (is_pinned !== undefined && is_pinned !== null) {
      paramCount++;
      updateFields.push(`is_pinned = $${paramCount}`);
      values.push(is_pinned);
    }

    if (published_at !== undefined) {
      paramCount++;
      updateFields.push(`published_at = $${paramCount}`);
      values.push(published_at);
    }

    // Optional fields: location, event_date, end_date
    if (location !== undefined && location !== null) {
      paramCount++;
      updateFields.push(`location = $${paramCount}`);
      values.push(location);
    }

    if (event_date !== undefined && event_date !== null) {
      paramCount++;
      updateFields.push(`event_date = $${paramCount}`);
      values.push(event_date ? new Date(event_date).toISOString().slice(0, 10) : null);
    }

    if (end_date !== undefined && end_date !== null) {
      paramCount++;
      updateFields.push(`end_date = $${paramCount}`);
      values.push(end_date ? new Date(end_date).toISOString().slice(0, 10) : null);
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

    logger.debug('Updating announcement', { announcement_id: id, fieldCount: updateFields.length });

    const result = await query(updateQuery, values);
    const announcement = result.rows[0];
    
    logger.debug('Update successful', { announcement_id: id, title: announcement.title });

    // Audit log
    try {
      const newStatus = status || currentAnnouncement.status;
      const actionLabel = newStatus === 'archived' && currentAnnouncement.status !== 'archived' ? 'Archive'
        : (newStatus === 'published' && currentAnnouncement.status !== 'published' ? 'Publish'
        : 'Update');
      await createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: actionLabel,
        resource: '/api/announcements',
        resourceId: id,
        resourceName: announcement.title,
        resourceType: 'announcements',
        category: 'Announcement Management',
        details: { changes: updateFields, previous_status: currentAnnouncement.status, new_status: newStatus },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (activityError) {
      logger.error('Error logging activity', { error: activityError.message, stack: activityError.stack, announcement_id });
    }

    // Send notification if status changed to published
    if (status === 'published' && currentAnnouncement.status !== 'published') {
      try {
      await notificationService.createNotification({
        user_type: 'all',
        title: 'Announcement Updated',
        message: announcement.title,
        type: 'announcement',
        priority: announcement.is_featured ? 'high' : 'normal',
          created_by: req.user.id
      });
        logger.debug('Notification sent successfully', { announcement_id, userId: req.user?.id });
      } catch (notificationError) {
        logger.error('Error sending notification', { error: notificationError.message, stack: notificationError.stack, announcement_id });
        // Don't fail the request if notification fails
      }
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

  // Realtime notify admin/staff and public
  try {
    const payload = { type: 'updated', item: { announcement_id: id, title: announcement.title, status: announcement.status } };
    emitToRole('admin', 'announcement:changed', payload);
    emitToRole('lydo_staff', 'announcement:changed', payload);
    emitBroadcast('announcement:changed', payload);
  } catch (_) {}

  } catch (error) {
    logger.error('Error updating announcement', { error: error.message, stack: error.stack, announcement_id: id });
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
    
    logger.debug('Delete successful', { announcement_id: id, title: getResult.rows[0].title });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: 'Delete',
        resource: '/api/announcements',
        resourceId: id,
        resourceName: getResult.rows[0].title,
        resourceType: 'announcements',
        category: 'Announcement Management',
        details: { deleted_at: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (activityError) {
      logger.error('Error logging delete activity', { error: activityError.message, stack: activityError.stack, announcement_id: id });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  try {
    const payload = { type: 'deleted', item: { announcement_id: id } };
    emitToRole('admin', 'announcement:changed', payload);
    emitToRole('lydo_staff', 'announcement:changed', payload);
    emitBroadcast('announcement:changed', payload);
  } catch (_) {}

  } catch (error) {
    logger.error('Error deleting announcement', { error: error.message, stack: error.stack, announcement_id: id });
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
        COUNT(CASE WHEN category = 'projects' THEN 1 END) as projects_count,
        COUNT(CASE WHEN category = 'programs' THEN 1 END) as programs_count,
        COUNT(CASE WHEN category = 'activities' THEN 1 END) as activities_count,
        COUNT(CASE WHEN category = 'meetings' THEN 1 END) as meetings_count,
        COUNT(CASE WHEN category = 'achievement' THEN 1 END) as achievement_count,
        COUNT(CASE WHEN category = 'announcements' THEN 1 END) as announcements_count
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
          projects: parseInt(stats.projects_count),
          programs: parseInt(stats.programs_count),
          activities: parseInt(stats.activities_count),
          meetings: parseInt(stats.meetings_count),
          achievement: parseInt(stats.achievement_count),
          announcements: parseInt(stats.announcements_count)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching announcement statistics', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement statistics',
      error: error.message
    });
  }
};

// Upload announcement image
export const uploadAnnouncementImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Check if announcement exists
    const currentQuery = 'SELECT * FROM "Announcements" WHERE announcement_id = $1';
    const currentResult = await query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const currentAnnouncement = currentResult.rows[0];

    try {
      logger.debug('Processing uploaded image for announcement', { filename: req.file.originalname, announcement_id: id });
      
      // Import required modules for image processing
      const sharp = (await import('sharp')).default;
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;
      
      // Create announcements directory if it doesn't exist
      const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
      const announcementsDir = path.join(uploadsBase, 'announcements');
      try { fs.mkdirSync(announcementsDir, { recursive: true }); } catch {}
      
      // Generate unique filename
      const fileExtension = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `${id}.${fileExtension}`;
      const targetPath = path.join(announcementsDir, fileName);
      
      // Process image with sharp (resize and optimize)
      const image = sharp(req.file.buffer).rotate();
      const metadata = await image.metadata();
      
      // Resize to reasonable dimensions (max 1200px width, maintain aspect ratio)
      const maxWidth = 1200;
      const maxHeight = 800;
      
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        await image.resize(maxWidth, maxHeight, { 
          fit: 'inside',
          withoutEnlargement: true 
        }).jpeg({ quality: 85 }).toFile(targetPath);
      } else {
        await image.jpeg({ quality: 85 }).toFile(targetPath);
      }
      
      // Set the image URL for database storage
      const finalImageUrl = `/uploads/announcements/${fileName}`;
      logger.debug('Image processed and saved', { imageUrl: finalImageUrl, announcement_id: id });
      
      // Update the announcement with new image URL
      const updateQuery = `
        UPDATE "Announcements" 
        SET image_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE announcement_id = $2
        RETURNING *
      `;
      
      const result = await query(updateQuery, [finalImageUrl, id]);
      const updatedAnnouncement = result.rows[0];
      
      logger.debug('Announcement image updated successfully', { announcement_id: id, imageUrl: finalImageUrl });
      
      // Log activity
      try {
        await activityLogService.logActivity({
          user_id: req.user.id,
          user_type: req.user.user_type,
          action: 'update',
          resource_type: 'announcement',
          resource_id: id,
          resource_name: updatedAnnouncement.title,
          details: { 
            changes: ['image_url'],
            previous_image: currentAnnouncement.image_url,
            new_image: finalImageUrl
          },
          category: 'Announcement'
        });
        logger.debug('Activity logged successfully', { announcement_id: id });
      } catch (activityError) {
        logger.error('Error logging activity', { error: activityError.message, stack: activityError.stack, announcement_id: id });
        // Don't fail the request if activity logging fails
      }
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          image_url: finalImageUrl,
          updated_at: updatedAnnouncement.updated_at
        }
      });
      
    } catch (imageError) {
      logger.error('Image processing error', { error: imageError.message, stack: imageError.stack, announcement_id: id });
      return res.status(500).json({
        success: false,
        message: 'Failed to process image'
      });
    }

  } catch (error) {
    logger.error('Error uploading announcement image', { error: error.message, stack: error.stack, announcement_id: id });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Bulk update announcement status
export const bulkUpdateAnnouncementStatus = async (req, res) => {
  try {
    const { announcement_ids, status } = req.body;
    
    logger.debug('Bulk update request', { announcement_ids_count: announcement_ids?.length, status, userId: req.user?.id });

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
    logger.debug('Executing bulk update query', { announcement_ids_count: announcement_ids.length, status });
    
    let result;
    try {
      result = await query(query, values);
      logger.info('Bulk update successful', { count: result.rows.length, status });
    } catch (queryError) {
      logger.error('Database query failed', { error: queryError.message, stack: queryError.stack, status });
      throw queryError;
    }

    // Audit log for each updated announcement
    for (const announcement of result.rows) {
      try {
        await createAuditLog({
          userId: req.user?.id || 'SYSTEM',
          userType: req.user?.userType || req.user?.user_type || 'admin',
          action: 'Bulk Update',
          resource: '/api/announcements',
          resourceId: announcement.announcement_id,
          resourceName: announcement.title,
          resourceType: 'announcements',
          category: 'Announcement Management',
          details: { new_status: status, bulk_operation: true },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'success'
        });
      } catch (activityError) {
        logger.error('Error logging bulk update activity', { error: activityError.message, stack: activityError.stack, announcement_id: announcement.announcement_id });
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${result.rows.length} announcements`,
      data: result.rows
    });

    // Realtime broadcast bulk status change
    try {
      const payload = { type: 'statusChanged', items: result.rows };
      emitToRole('admin', 'announcement:changed', payload);
      emitToRole('lydo_staff', 'announcement:changed', payload);
      emitBroadcast('announcement:changed', payload);
    } catch (_) {}

  } catch (error) {
    logger.error('Error bulk updating announcement status', { error: error.message, stack: error.stack, status, announcement_ids_count: announcement_ids?.length });
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update announcement status',
      error: error.message
    });
  }
};
