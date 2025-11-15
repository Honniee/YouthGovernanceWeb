import { getClient } from '../config/database.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

// GET /api/sk-federation/:termId
export const getFederationByTerm = async (req, res) => {
  const { termId } = req.params;
  if (!termId) return res.status(400).json({ success: false, message: 'termId is required' });
  const client = await getClient();
  try {
    // Filter to only return active records (is_active = true) to match public endpoint behavior
    // This ensures consistency and prevents showing inactive/historical assignments in the UI
    const result = await client.query(
      `SELECT f.federation_officer_id,
              f.term_id,
              f.official_id,
              f.position,
              f.display_order,
              f.is_active,
              o.first_name,
              o.last_name,
              o.position AS official_position,
              o.barangay_id
       FROM "SK_Federation_Officers" f
       JOIN "SK_Officials" o ON o.sk_id = f.official_id
       WHERE f.term_id = $1 AND f.is_active = true
       ORDER BY f.display_order, f.position`,
      [termId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('getFederationByTerm error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch SK Federation officers' });
  } finally {
    client.release();
  }
};

// Public: GET current term federation (no auth)
export const getFederationPublicCurrent = async (req, res) => {
  const client = await getClient();
  try {
    // Check if termId is provided in query params, otherwise get active term
    let termId = req.query?.termId;
    
    if (!termId) {
      // Determine current term
      const termRes = await client.query(
        `SELECT term_id FROM "SK_Terms"
         WHERE is_current = true OR status = 'active'
         ORDER BY is_current DESC, updated_at DESC
         LIMIT 1`
      );
      termId = termRes.rows?.[0]?.term_id;
    }
    
    if (!termId) return res.json({ success: true, data: [] });

    const result = await client.query(
      `SELECT f.federation_officer_id,
              f.term_id,
              f.official_id,
              f.position,
              f.display_order,
              f.is_active,
              o.first_name,
              o.middle_name,
              o.last_name,
              o.position AS official_position,
              o.barangay_id,
              o.profile_picture,
              o.updated_at,
              b.barangay_name
       FROM "SK_Federation_Officers" f
       JOIN "SK_Officials" o ON o.sk_id = f.official_id
       LEFT JOIN "Barangay" b ON o.barangay_id = b.barangay_id
       WHERE f.term_id = $1 AND f.is_active = true
       ORDER BY f.display_order, f.position`,
      [termId]
    );
    return res.json({ success: true, data: result.rows, termId });
  } catch (error) {
    logger.error('getFederationPublicCurrent error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch SK Federation officers' });
  } finally {
    client.release();
  }
};

// PUT /api/sk-federation/:termId
// Body: { assignments: [{ position, official_id, display_order?, is_active? }, ...] }
export const upsertFederationByTerm = async (req, res) => {
  const { termId } = req.params;
  const { assignments } = req.body || {};
  if (!termId) return res.status(400).json({ success: false, message: 'termId is required' });
  if (!Array.isArray(assignments)) return res.status(400).json({ success: false, message: 'assignments array is required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Backend validation: Check for duplicate official assignments
    const assignedOfficials = assignments
      .filter(a => a.official_id && a.official_id.trim())
      .map(a => String(a.official_id).trim());
    const duplicateIds = assignedOfficials.filter((id, index) => 
      assignedOfficials.indexOf(id) !== index
    );
    
    if (duplicateIds.length > 0) {
      await client.query('ROLLBACK');
      const duplicatePositions = assignments
        .filter(a => duplicateIds.includes(String(a.official_id).trim()))
        .map(a => a.position);
      return res.status(400).json({
        success: false,
        message: `Duplicate assignment detected: The same official cannot be assigned to multiple federation positions.`,
        details: {
          duplicateOfficialId: duplicateIds[0],
          conflictingPositions: [...new Set(duplicatePositions)]
        }
      });
    }

    // Get user_id from Users table (created_by must reference Users.user_id, not LYDO.lydo_id)
    let createdBy = null;
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    if (lydoId) {
      try {
        const userResult = await client.query(
          'SELECT user_id FROM "Users" WHERE lydo_id = $1',
          [lydoId]
        );
        if (userResult.rows.length > 0) {
          createdBy = userResult.rows[0].user_id;
        }
      } catch (err) {
        logger.warn('Could not map lydo_id to user_id, using null for created_by', { error: err.message, stack: err.stack });
      }
    }

    // Get existing federation officers for this term
    const existingResult = await client.query(
      'SELECT federation_officer_id, position, official_id, is_active FROM "SK_Federation_Officers" WHERE term_id = $1',
      [termId]
    );
    const existing = existingResult.rows || [];
    const existingByPosition = {};
    existing.forEach(row => {
      existingByPosition[row.position] = row;
    });

    // Process assignments: UPDATE existing or INSERT new
    const incomingPositions = new Set();
    for (const [idx, a] of assignments.entries()) {
      const position = String(a.position || '').trim();
      const officialId = String(a.official_id || '').trim();
      if (!position || !officialId) continue;
      
      incomingPositions.add(position);
      const displayOrder = Number.isFinite(a.display_order) ? a.display_order : idx + 1;
      const isActive = a.is_active === false ? false : true;
      
      const existingRecord = existingByPosition[position];
      
      if (existingRecord) {
        // UPDATE existing record
        await client.query(
          `UPDATE "SK_Federation_Officers"
           SET official_id = $1, display_order = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
           WHERE federation_officer_id = $4`,
          [officialId, displayOrder, isActive, existingRecord.federation_officer_id]
        );
      } else {
        // INSERT new record
        await client.query(
          `INSERT INTO "SK_Federation_Officers"
           (term_id, official_id, position, display_order, is_active, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [termId, officialId, position, displayOrder, isActive, createdBy]
        );
      }
    }

    // Soft delete positions not in incoming assignments (set is_active = false)
    for (const existingRecord of existing) {
      if (!incomingPositions.has(existingRecord.position) && existingRecord.is_active) {
        await client.query(
          `UPDATE "SK_Federation_Officers"
           SET is_active = false, updated_at = CURRENT_TIMESTAMP
           WHERE federation_officer_id = $1`,
          [existingRecord.federation_officer_id]
        );
      }
    }

    // Final validation: Ensure no duplicate official_id in active positions after update
    const finalCheckResult = await client.query(
      `SELECT official_id, array_agg(position) as positions
       FROM "SK_Federation_Officers"
       WHERE term_id = $1 AND is_active = true
       GROUP BY official_id
       HAVING COUNT(*) > 1`,
      [termId]
    );

    if (finalCheckResult.rows.length > 0) {
      await client.query('ROLLBACK');
      const duplicate = finalCheckResult.rows[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate assignment detected: The same official cannot be assigned to multiple active federation positions.`,
        details: {
          duplicateOfficialId: duplicate.official_id,
          conflictingPositions: duplicate.positions
        }
      });
    }

    await client.query('COMMIT');

    // Build detailed audit log information
    const auditDetails = {
      termId,
      totalAssignments: assignments.length,
      assignments: assignments.map(a => ({
        position: a.position,
        officialId: a.official_id
      })),
      changes: []
    };

    // Track what changed: new assignments, updates, and removals
    const existingActive = existing.filter(e => e.is_active);
    const existingByPositionMap = {};
    existingActive.forEach(e => {
      existingByPositionMap[e.position] = e.official_id;
    });

    assignments.forEach(a => {
      const existingOfficialId = existingByPositionMap[a.position];
      if (!existingOfficialId) {
        // New assignment
        auditDetails.changes.push({
          type: 'assigned',
          position: a.position,
          officialId: a.official_id
        });
      } else if (existingOfficialId !== a.official_id) {
        // Changed assignment
        auditDetails.changes.push({
          type: 'changed',
          position: a.position,
          oldOfficialId: existingOfficialId,
          newOfficialId: a.official_id
        });
      }
    });

    // Track removals (positions that were active but not in new assignments)
    existingActive.forEach(e => {
      if (!incomingPositions.has(e.position)) {
        auditDetails.changes.push({
          type: 'removed',
          position: e.position,
          officialId: e.official_id
        });
      }
    });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.lydo_id || null,
        userType: req.user?.userType || 'admin',
        action: 'Update',
        resource: '/api/sk-federation',
        resourceId: termId,
        resourceName: 'SK Federation Officers',
        resourceType: 'sk_federation',
        category: 'SK Governance',
        details: auditDetails,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (_) {}

    return res.json({ success: true, message: 'SK Federation updated', data: { termId, total: assignments.length } });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('upsertFederationByTerm error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to update SK Federation officers' });
  } finally {
    client.release();
  }
};

export default { getFederationByTerm, upsertFederationByTerm, getFederationPublicCurrent };


