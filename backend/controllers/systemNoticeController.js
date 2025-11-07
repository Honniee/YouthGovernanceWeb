import { getClient } from '../config/database.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import { emitToAdmins, emitBroadcast } from '../services/realtime.js';

// Return current system notice or sensible defaults
export const getSystemNotice = async (req, res) => {
  const client = await getClient();
  try {
    const result = await client.query(`
      CREATE TABLE IF NOT EXISTS "System_Notice" (
        id SMALLINT PRIMARY KEY DEFAULT 1,
        enabled BOOLEAN NOT NULL DEFAULT false,
        dismissible BOOLEAN NOT NULL DEFAULT true,
        type TEXT NOT NULL DEFAULT 'info',
        text TEXT NOT NULL DEFAULT '',
        expires_at TIMESTAMP NULL,
        updated_by TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const rowRes = await client.query(
      `SELECT id, enabled, dismissible, type, text, expires_at AS "expiresAt",
              created_by AS "createdBy", created_at AS "createdAt",
              updated_by AS "updatedBy", updated_at AS "updatedAt"
       FROM "System_Notice" WHERE id = 1`
    );

    if (rowRes.rows.length === 0) {
      // Seed a default row
      // Respect FK: only set created_by if it exists in Users
      const candidateId = req.user?.id || req.user?.user_id || null;
      let fkCreatedBy = null;
      if (candidateId) {
        const fkCheck = await client.query('SELECT user_id FROM "Users" WHERE user_id = $1', [candidateId]);
        fkCreatedBy = fkCheck.rows.length > 0 ? candidateId : null;
      }
      await client.query(
        `INSERT INTO "System_Notice" (id, enabled, dismissible, type, text, created_by)
         VALUES (1, false, true, 'info', '', $1)`,
        [fkCreatedBy]
      );
      return res.json({ success: true, data: { enabled: false, dismissible: true, type: 'info', text: '', expiresAt: null, createdBy: fkCreatedBy, createdAt: new Date().toISOString() } });
    }

    return res.json({ success: true, data: rowRes.rows[0] });
  } catch (error) {
    console.error('❌ getSystemNotice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load system notice' });
  } finally {
    client.release();
  }
};

export const updateSystemNotice = async (req, res) => {
  const client = await getClient();
  try {
    const { enabled = false, dismissible = true, type = 'info', text = '', expiresAt = null } = req.body || {};
    await client.query('BEGIN');

    // Ensure table exists and row seeded
    await client.query(`
      CREATE TABLE IF NOT EXISTS "System_Notice" (
        id SMALLINT PRIMARY KEY DEFAULT 1,
        enabled BOOLEAN NOT NULL DEFAULT false,
        dismissible BOOLEAN NOT NULL DEFAULT true,
        type TEXT NOT NULL DEFAULT 'info',
        text TEXT NOT NULL DEFAULT '',
        expires_at TIMESTAMP NULL,
        updated_by TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Respect FK for updated_by: only set if present in Users
    const candidateUpdateId = req.user?.id || req.user?.user_id || null;
    let fkUpdatedBy = null;
    if (candidateUpdateId) {
      const fkUpdateCheck = await client.query('SELECT user_id FROM "Users" WHERE user_id = $1', [candidateUpdateId]);
      fkUpdatedBy = fkUpdateCheck.rows.length > 0 ? candidateUpdateId : null;
    }

    await client.query(
      `INSERT INTO "System_Notice" (id, enabled, dismissible, type, text, expires_at, updated_by, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         enabled = EXCLUDED.enabled,
         dismissible = EXCLUDED.dismissible,
         type = EXCLUDED.type,
         text = EXCLUDED.text,
         expires_at = EXCLUDED.expires_at,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
      `,
      [enabled, dismissible, type, text, expiresAt ? new Date(expiresAt) : null, fkUpdatedBy]
    );

    await client.query('COMMIT');

    try {
      await createAuditLog({
        userId: req.user?.id || req.user?.user_id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Update Notice',
        resource: '/api/system/notice',
        resourceId: 'system_notice',
        resourceName: 'System Notice',
        resourceType: 'system_notice',
        category: 'System Management',
        details: { enabled, dismissible, type, expiresAt },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (e) {
      console.warn('⚠️ Failed to log system notice update:', e?.message);
    }

    // Realtime notify public/admin clients about notice change
    try {
      const payload = { enabled, dismissible, type, text, expiresAt };
      emitToAdmins('systemNotice:changed', payload);
      emitBroadcast('systemNotice:changed', payload);
    } catch (_) {}

    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ updateSystemNotice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update system notice' });
  } finally {
    client.release();
  }
};

export default { getSystemNotice, updateSystemNotice };
