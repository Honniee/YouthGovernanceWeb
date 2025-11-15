import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { 
  // Roles
  getCouncilRoles, 
  createCouncilRole, 
  updateCouncilRole, 
  deleteCouncilRole,
  // Members
  getCouncilMembers, 
  createCouncilMember, 
  updateCouncilMember, 
  deleteCouncilMember,
  bulkUpdateCouncilMembers,
  // Page
  getCouncilPage, 
  updateCouncilPage,
  // Export
  logCouncilExport 
} from '../controllers/councilController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole, requireLYDOStaff } from '../middleware/roleCheck.js';
import { query } from '../config/database.js';
import { createAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

// ---------- File upload config for council hero images ----------
const uploadsBase = process.env.UPLOADS_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'uploads');
const councilDir = path.join(uploadsBase, 'council');
try { fs.mkdirSync(councilDir, { recursive: true }); } catch {}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10) }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

// ========== PUBLIC ROUTES ==========
// Get active council members (public)
router.get('/members', getCouncilMembers);
router.get('/page', getCouncilPage);

// ========== ADMIN ROUTES - ROLES ==========
// Council Roles management
router.get('/roles', authenticateToken, requireRole('admin'), getCouncilRoles);
router.post('/roles', authenticateToken, requireRole('admin'), createCouncilRole);
router.put('/roles/:id', authenticateToken, requireRole('admin'), updateCouncilRole);
router.delete('/roles/:id', authenticateToken, requireRole('admin'), deleteCouncilRole);

// ========== ADMIN ROUTES - MEMBERS ==========
// Council Members management
router.get('/members/all', authenticateToken, requireRole('admin'), async (req, res) => {
  // Get all members including inactive
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
       ORDER BY cm.is_active DESC, cr.role_name, cm.member_name`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch all council members' });
  }
});
router.post('/members', authenticateToken, requireRole('admin'), createCouncilMember);
router.put('/members/:id', authenticateToken, requireRole('admin'), updateCouncilMember);
router.delete('/members/:id', authenticateToken, requireRole('admin'), deleteCouncilMember);
router.post('/members/bulk', authenticateToken, requireRole('admin'), bulkUpdateCouncilMembers);

// ========== ADMIN ROUTES - PAGE ==========
router.put('/page', authenticateToken, requireRole('admin'), updateCouncilPage);

// ========== ADMIN ROUTES - EXPORT ==========
router.post('/export', authenticateToken, requireRole('admin'), logCouncilExport);

// Upload and set a specific hero image (1|2|3)
router.post('/page/hero/:idx', authenticateToken, requireLYDOStaff, upload.single('file'), async (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (![1,2,3].includes(idx)) {
      return res.status(400).json({ success: false, message: 'Invalid hero index' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const filename = `hero_${idx}.jpg`;
    const targetPath = path.join(councilDir, filename);

    // Convert to JPEG and save
    await sharp(req.file.buffer)
      .jpeg({ quality: 85 })
      .toFile(targetPath);

    const relUrl = `/uploads/council/${filename}`;

    // Get user_id from Users table for created_by
    const lydoId = req.user?.id || req.user?.user_id || req.user?.lydo_id;
    let createdBy = null;
    if (lydoId) {
      try {
        const userResult = await query('SELECT user_id FROM "Users" WHERE lydo_id = $1', [lydoId]);
        if (userResult.rows.length > 0) {
          createdBy = userResult.rows[0].user_id;
        }
      } catch {}
    }
    if (!createdBy) {
      try {
        const any = await query('SELECT user_id FROM "Users" ORDER BY created_at ASC LIMIT 1');
        if (any.rows.length > 0) createdBy = any.rows[0].user_id;
      } catch {}
    }

    // Ensure a page row exists and check if this hero already has an image
    const existing = await query('SELECT id, hero_url_1, hero_url_2, hero_url_3 FROM "LYDO_Council_Page" ORDER BY created_at DESC LIMIT 1');
    const pageId = existing.rows.length > 0 ? existing.rows[0].id : 'LYDCPAGE001';
    
    // Determine if this is a new upload or replacing an existing image
    const heroKey = idx === 1 ? 'hero_url_1' : idx === 2 ? 'hero_url_2' : 'hero_url_3';
    const existingHeroUrl = existing.rows.length > 0 ? existing.rows[0][heroKey] : null;
    const isNewImage = existing.rows.length === 0 || !existingHeroUrl;
    const action = isNewImage ? 'Upload' : 'Replace';
    
    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO "LYDO_Council_Page" (id, hero_url_1, hero_url_2, hero_url_3, created_by) VALUES ($1, $2, $3, $4, $5)',
        [pageId, idx === 1 ? relUrl : null, idx === 2 ? relUrl : null, idx === 3 ? relUrl : null, createdBy]
      );
    } else {
      const col = idx === 1 ? 'hero_url_1' : (idx === 2 ? 'hero_url_2' : 'hero_url_3');
      await query(`UPDATE "LYDO_Council_Page" SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [relUrl, existing.rows[0].id]);
    }

    // Log activity
    try {
      await createAuditLog({
        userId: lydoId || 'SYSTEM',
        userType: req.user?.userType || req.user?.user_type || 'admin',
        action: action,
        resource: `/api/council/page/hero/${idx}`,
        resourceId: pageId,
        resourceName: 'Council Page',
        resourceType: 'council',
        details: { 
          [heroKey]: relUrl, 
          heroIndex: idx,
          filename: filename,
          previousUrl: existingHeroUrl || null,
          actionType: isNewImage ? 'upload' : 'replace',
          resourceType: 'council-page' 
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    } catch (logError) {
      logger.error('Failed to log activity for hero image upload', { error: logError.message, stack: logError.stack });
      // Don't fail the request if logging fails
    }

    return res.json({ success: true, url: relUrl });
  } catch (error) {
    logger.error('Failed to upload council hero image', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to upload hero image' });
  }
});

// Backward compatibility
router.get('/', getCouncilMembers);
router.post('/', authenticateToken, requireRole('admin'), createCouncilMember);
router.put('/:id', authenticateToken, requireRole('admin'), updateCouncilMember);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteCouncilMember);

export default router;


