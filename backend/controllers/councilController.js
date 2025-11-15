import { query } from '../config/database.js';
import { generateCouncilMemberId, generateCouncilRoleId } from '../utils/idGenerator.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

// ============================================================================
// COUNCIL ROLES - Manage role definitions
// ============================================================================

export const getCouncilRoles = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, role_name, role_description, created_at, updated_at FROM "LYDO_Council_Roles" ORDER BY role_name'
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Failed to fetch council roles', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch council roles' });
  }
};

export const createCouncilRole = async (req, res) => {
  try {
    const { role_name, role_description = null } = req.body || {};

    if (!role_name) {
      return res.status(400).json({ success: false, message: 'role_name is required' });
    }

    // Get user_id from Users table (created_by must reference Users.user_id, not LYDO.lydo_id)
    let created_by = null;
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    if (lydoId) {
      try {
        const userResult = await query(
          'SELECT user_id FROM "Users" WHERE lydo_id = $1',
          [lydoId]
        );
        if (userResult.rows.length > 0) {
          created_by = userResult.rows[0].user_id;
        }
      } catch (err) {
        logger.warn('Could not map lydo_id to user_id, using null for created_by', { error: err.message, stack: err.stack });
      }
    }

    if (!created_by) {
      return res.status(400).json({ success: false, message: 'User authentication required' });
    }

    const id = await generateCouncilRoleId();

    const result = await query(
      `INSERT INTO "LYDO_Council_Roles" (id, role_name, role_description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, role_name, role_description, created_by]
    );

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'CREATE_COUNCIL_ROLE',
      resource: '/api/council/roles',
      resourceId: id,
      details: { role_name, role_description },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create council role', { error: error.message, stack: error.stack, roleName: req.body?.role_name });
    return res.status(500).json({ success: false, message: 'Failed to create council role' });
  }
};

export const updateCouncilRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name, role_description } = req.body || {};

    if (!role_name) {
      return res.status(400).json({ success: false, message: 'role_name is required' });
    }

    const result = await query(
      `UPDATE "LYDO_Council_Roles" 
       SET role_name = $1, role_description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [role_name, role_description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Council role not found' });
    }

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'UPDATE_COUNCIL_ROLE',
      resource: '/api/council/roles',
      resourceId: id,
      details: { role_name, role_description },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to update council role', { error: error.message, stack: error.stack, roleId: req.params.id });
    return res.status(500).json({ success: false, message: 'Failed to update council role' });
  }
};

export const deleteCouncilRole = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM "LYDO_Council_Roles" WHERE id = $1', [id]);

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'DELETE_COUNCIL_ROLE',
      resource: '/api/council/roles',
      resourceId: id,
      details: { roleId: id },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete council role', { error: error.message, stack: error.stack, roleId: req.params.id });
    return res.status(500).json({ success: false, message: 'Failed to delete council role' });
  }
};

// ============================================================================
// COUNCIL MEMBERS - Manage actual members
// ============================================================================

export const getCouncilMembers = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         cm.id,
         cm.role_id,
         cm.member_name AS name,
         cm.is_active,
         cr.role_name AS role
       FROM "LYDO_Council_Members" cm
       JOIN "LYDO_Council_Roles" cr ON cm.role_id = cr.id
       WHERE cm.is_active = TRUE
       ORDER BY cr.role_name, cm.member_name`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Failed to fetch council members', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch council members' });
  }
};

export const createCouncilMember = async (req, res) => {
  try {
    const {
      role_id, // Changed: now expects role_id instead of role
      member_name,
      is_active = true
    } = req.body || {};

    if (!role_id || !member_name) {
      return res.status(400).json({ success: false, message: 'role_id and member_name are required' });
    }

    // Get user_id from Users table (created_by must reference Users.user_id, not LYDO.lydo_id)
    let created_by = null;
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    if (lydoId) {
      try {
        const userResult = await query(
          'SELECT user_id FROM "Users" WHERE lydo_id = $1',
          [lydoId]
        );
        if (userResult.rows.length > 0) {
          created_by = userResult.rows[0].user_id;
        }
      } catch (err) {
        logger.warn('Could not map lydo_id to user_id, using null for created_by', { error: err.message, stack: err.stack });
      }
    }

    if (!created_by) {
      return res.status(400).json({ success: false, message: 'User authentication required' });
    }

    const id = await generateCouncilMemberId();

    const result = await query(
      `INSERT INTO "LYDO_Council_Members" 
       (id, role_id, member_name, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, role_id, member_name, is_active, created_by]
    );

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'CREATE_COUNCIL_MEMBER',
      resource: '/api/council/members',
      resourceId: id,
      details: { member_name, role_id, is_active },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to create council member', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to create council member' });
  }
};

export const updateCouncilMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      role_id,
      member_name,
      is_active
    } = req.body || {};

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (role_id !== undefined) {
      updates.push(`role_id = $${paramCount++}`);
      values.push(role_id);
    }
    if (member_name !== undefined) {
      updates.push(`member_name = $${paramCount++}`);
      values.push(member_name);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "LYDO_Council_Members" 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Council member not found' });
    }

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'UPDATE_COUNCIL_MEMBER',
      resource: '/api/council/members',
      resourceId: id,
      details: { member_name, role_id, is_active },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to update council member', { error: error.message, stack: error.stack, memberId: req.params.id });
    return res.status(500).json({ success: false, message: 'Failed to update council member' });
  }
};

export const deleteCouncilMember = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM "LYDO_Council_Members" WHERE id = $1', [id]);

    // Log activity
    await createAuditLog({
      userId: req.user?.id || req.user?.user_id || 'SYSTEM',
      userType: req.user?.userType || req.user?.user_type || 'admin',
      action: 'DELETE_COUNCIL_MEMBER',
      resource: '/api/council/members',
      resourceId: id,
      details: { memberId: id },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
      category: 'System Management'
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete council member', { error: error.message, stack: error.stack, memberId: req.params.id });
    return res.status(500).json({ success: false, message: 'Failed to delete council member' });
  }
};

export const bulkUpdateCouncilMembers = async (req, res) => {
  try {
    const { ids, action } = req.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    if (!action || !['activate', 'deactivate', 'delete'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be activate, deactivate, or delete' });
    }

    const results = [];
    const errors = [];

    if (action === 'delete') {
      for (const id of ids) {
        try {
          await query('DELETE FROM "LYDO_Council_Members" WHERE id = $1', [id]);
          results.push(id);
        } catch (error) {
          logger.error('Failed to delete member in bulk operation', { error: error.message, stack: error.stack, memberId: id });
          errors.push({ id, error: error.message });
        }
      }
    } else {
      const isActive = action === 'activate';
      for (const id of ids) {
        try {
          await query(
            'UPDATE "LYDO_Council_Members" SET is_active = $1, updated_at = NOW() WHERE id = $2',
            [isActive, id]
          );
          results.push(id);
        } catch (error) {
          logger.error('Failed to perform bulk operation on member', { error: error.message, stack: error.stack, action, memberId: id });
          errors.push({ id, error: error.message });
        }
      }
    }

    // Get lydoId for logging
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    const bulkAction = action.charAt(0).toUpperCase() + action.slice(1);
    const resourceName = `Council Members Bulk ${bulkAction} - ${results.length} member${results.length !== 1 ? 's' : ''}`;

    // Log activity
    try {
      await createAuditLog({
        userId: lydoId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: `Bulk ${bulkAction}`,
        resource: '/api/council/members/bulk',
        resourceId: null,
        resourceName: resourceName,
        resourceType: 'council',
        details: {
          resourceType: 'council-member',
          totalItems: ids.length,
          successCount: results.length,
          errorCount: errors.length,
          action: action
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: errors.length === 0 ? 'success' : (results.length > 0 ? 'partial' : 'error')
      });
    } catch (logError) {
      logger.error('Failed to log activity for bulk operation', { error: logError.message, stack: logError.stack, action, count: results.length });
      // Don't fail the request if logging fails
    }

    return res.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('Failed to perform bulk operation', { error: error.message, stack: error.stack, action });
    return res.status(500).json({ success: false, message: 'Failed to perform bulk operation' });
  }
};

// ============================================================================
// COUNCIL PAGE - Manage hero images
// ============================================================================

export const getCouncilPage = async (req, res) => {
  try {
    // Assuming first record or singleton pattern
    const result = await query(
      'SELECT id, hero_url_1, hero_url_2, hero_url_3, updated_at FROM "LYDO_Council_Page" ORDER BY created_at DESC LIMIT 1'
    );
    const row = result.rows[0] || { hero_url_1: null, hero_url_2: null, hero_url_3: null };
    return res.json({ success: true, data: row });
  } catch (error) {
    logger.error('Failed to fetch council page', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch council page' });
  }
};

export const updateCouncilPage = async (req, res) => {
  try {
    const { hero_url_1 = null, hero_url_2 = null, hero_url_3 = null } = req.body || {};
    
    // Get user_id from Users table (created_by must reference Users.user_id, not LYDO.lydo_id)
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    if (!lydoId) {
      return res.status(400).json({ success: false, message: 'User authentication required' });
    }

    const userResult = await query(
      'SELECT user_id FROM "Users" WHERE lydo_id = $1',
      [lydoId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found in Users table' });
    }
    
    const created_by = userResult.rows[0].user_id;

    // First, try to get existing record
    const existing = await query(
      'SELECT id, hero_url_1, hero_url_2, hero_url_3 FROM "LYDO_Council_Page" ORDER BY created_at DESC LIMIT 1'
    );

    // Determine what changed and create detailed action description
    const oldHeroes = existing.rows.length > 0 ? {
      hero_url_1: existing.rows[0].hero_url_1 || null,
      hero_url_2: existing.rows[0].hero_url_2 || null,
      hero_url_3: existing.rows[0].hero_url_3 || null
    } : { hero_url_1: null, hero_url_2: null, hero_url_3: null };

    const newHeroes = {
      hero_url_1: hero_url_1 || null,
      hero_url_2: hero_url_2 || null,
      hero_url_3: hero_url_3 || null
    };

    // Track which images were added, removed, or updated
    const changes = [];
    const removals = [];
    const additions = [];
    const updates = [];
    
    for (let i = 1; i <= 3; i++) {
      const key = `hero_url_${i}`;
      const oldVal = oldHeroes[key];
      const newVal = newHeroes[key];
      
      if (!oldVal && newVal) {
        changes.push(`Added Hero ${i}`);
        additions.push(i);
      } else if (oldVal && !newVal) {
        changes.push(`Removed Hero ${i}`);
        removals.push(i);
      } else if (oldVal && newVal && oldVal !== newVal) {
        changes.push(`Updated Hero ${i}`);
        updates.push(i);
      }
    }

    const pageId = existing.rows.length > 0 ? existing.rows[0].id : 'LYDCPAGE001';
    
    // Determine action based on what changed - use specific actions for hero images
    let action;
    if (existing.rows.length === 0) {
      // Creating new page with hero images
      action = additions.length > 0 ? 'Upload' : 'Create';
    } else if (removals.length > 0 && additions.length === 0 && updates.length === 0) {
      // Only removals, no additions or updates - use Remove action
      action = 'Remove';
    } else if (additions.length > 0 && updates.length === 0 && removals.length === 0) {
      // Only additions, no updates or removals - use Upload action
      action = 'Upload';
    } else if (updates.length > 0 || (additions.length > 0 && removals.length > 0)) {
      // Has updates, or mix of additions and removals - use Replace action
      action = 'Replace';
    } else {
      // Fallback
      action = 'Update';
    }
    
    const changeDescription = changes.length > 0 ? changes.join(', ') : 'No changes detected';

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await query(
        `UPDATE "LYDO_Council_Page" 
         SET hero_url_1 = $1, hero_url_2 = $2, hero_url_3 = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING hero_url_1, hero_url_2, hero_url_3, updated_at`,
        [hero_url_1, hero_url_2, hero_url_3, existing.rows[0].id]
      );
    } else {
      // Create new record
      result = await query(
        `INSERT INTO "LYDO_Council_Page" (id, hero_url_1, hero_url_2, hero_url_3, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING hero_url_1, hero_url_2, hero_url_3, updated_at`,
        [pageId, hero_url_1, hero_url_2, hero_url_3, created_by]
      );
    }

    // Log activity
    try {
      await createAuditLog({
        userId: lydoId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: action,
        resource: '/api/council/page',
        resourceId: pageId,
        resourceName: 'Council Page',
        resourceType: 'council', // Override to use 'council' instead of auto-extracted 'page'
        details: { 
          hero_url_1: hero_url_1 || null, 
          hero_url_2: hero_url_2 || null, 
          hero_url_3: hero_url_3 || null,
          previousHeroes: oldHeroes,
          changes: changeDescription,
          resourceType: 'council-page' 
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for update council page', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Failed to update council page', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to update council page' });
  }
};

export const logCouncilExport = async (req, res) => {
  try {
    const { format, type, count, exportType = 'all' } = req.body || {};
    
    // Get lydoId for logging
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    const action = exportType === 'selected' || exportType === 'bulk' ? 'Bulk Export' : 'Export';
    const resourceName = type === 'role' 
      ? `Council Roles Export (${count} roles)`
      : `Council Members Export (${count} members)`;

    // Log activity
    try {
      await createAuditLog({
        userId: lydoId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: action,
        resource: '/api/council/export',
        resourceId: null,
        resourceName: resourceName,
        resourceType: 'council',
        details: {
          resourceType: 'council',
          reportType: type,
          format: format,
          count: count,
          exportType: exportType
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log export activity', { error: logError.message, stack: logError.stack, format });
      // Don't fail the request if logging fails
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to log council export', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to log export' });
  }
};
