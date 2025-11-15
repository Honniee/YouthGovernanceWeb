import { query, getClient } from '../config/database.js';
import PDFDocument from 'pdfkit';
import bcrypt from 'bcryptjs';
import { generateLYDOId } from '../utils/idGenerator.js';
import { generateSecurePassword } from '../utils/passwordGenerator.js';
import { generateOrgEmail } from '../utils/emailGenerator.js';
import { 
	generateOfficialFormat, 
	generateModernFormat, 
	generateDetailedFormat, 
	generateTableFormat 
} from '../utils/pdfFormats.js';
import { 
  validateStaffCreation, 
  validateStaffUpdate, 
  validateStatusUpdate, 
  validateBulkOperation,
  validateSearchParams,
  sanitizeInput, 
  validatePagination, 
  validateSorting 
} from '../utils/validation.js';
import { createUserForStaff, createUserForAdmin } from '../utils/usersTableHelper.js';
import notificationService from '../services/notificationService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

const DEFAULT_ROLE_ID = 'ROL002'; // lydo_staff

// Map DB row to API response shape
const mapStaffRow = (row) => ({
	lydoId: row.lydo_id,
	roleId: row.role_id,
	email: row.email,
	personalEmail: row.personal_email,
	firstName: row.first_name,
	lastName: row.last_name,
	middleName: row.middle_name,
	suffix: row.suffix,
	profilePicture: row.profile_picture,
	isActive: row.is_active,
	emailVerified: row.email_verified,
	createdBy: row.created_by,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	deactivated: row.deactivated,
	deactivatedAt: row.deactivated_at
});

export const listStaff = async (req, res) => {
	try {
		// Validate search parameters
		const searchValidation = validateSearchParams(req.query);
		if (!searchValidation.isValid) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid search parameters', 
				errors: searchValidation.errors 
			});
		}

		const { q, status } = req.query;
		const { page, limit, offset } = validatePagination(req.query);
		const { sortBy, sortOrder } = validateSorting({
			sortBy: req.query.sortBy,
			sortOrder: req.query.sortOrder
		});

		let whereClauses = [];
		let params = [];
		let idx = 1;

		// Enhanced search with full-text search
		if (q) {
			whereClauses.push(`(
				LOWER(first_name) LIKE $${idx} OR 
				LOWER(last_name) LIKE $${idx} OR 
				LOWER(email) LIKE $${idx} OR
				LOWER(personal_email) LIKE $${idx} OR
				to_tsvector('english', first_name || ' ' || last_name) @@ plainto_tsquery('english', $${idx})
			)`);
			params.push(`%${String(q).toLowerCase()}%`);
			idx++;
		}
		
		if (status === 'active') {
			whereClauses.push(`is_active = true AND deactivated = false`);
		} else if (status === 'deactivated') {
			whereClauses.push(`(is_active = false OR deactivated = true)`);
		}

		const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

		// Add role filter to only show LYDO staff (not admins) - SECURITY FIX: Use parameterized query
		whereClauses.push(`role_id = $${idx}`);
		params.push(DEFAULT_ROLE_ID);
		idx++;

		const finalWhereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

		const sql = `
			SELECT * FROM "LYDO"
			${finalWhereSQL}
			ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
			LIMIT $${idx} OFFSET $${idx + 1}
		`;
		params.push(limit, offset);

		// Count query uses same params (excluding limit/offset)
		const countParams = params.slice(0, -2);
		const [rowsResult, countResult] = await Promise.all([
			query(sql, params),
			query(`SELECT COUNT(*) as count FROM "LYDO" ${finalWhereSQL}`, countParams)
		]);

		const total = parseInt(countResult.rows[0]?.count || '0');
		const items = rowsResult.rows.map(mapStaffRow);
		
		return res.json({ 
			success: true,
			page, 
			limit, 
			total, 
			items,
			hasNextPage: (page * limit) < total,
			hasPrevPage: page > 1
		});
	} catch (error) {
		logger.error('listStaff error', { error: error.message, stack: error.stack });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to list staff',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

export const getStaffById = async (req, res) => {
	try {
		const { id } = req.params;
		
		// Validate ID format
		if (!/^LYDO\d{3}$/.test(id)) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid staff ID format' 
			});
		}

		const result = await query('SELECT * FROM "LYDO" WHERE lydo_id = $1', [id]);
		if (result.rows.length === 0) {
			return res.status(404).json({ 
				success: false,
				message: 'Staff not found' 
			});
		}
		
		return res.json({ 
			success: true,
			staff: mapStaffRow(result.rows[0]) 
		});
	} catch (error) {
		logger.error('getStaffById error', { error: error.message, stack: error.stack, staffId: req.params.id });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to get staff',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

export const createStaff = async (req, res) => {
	try {
		const rawData = req.body || {};
		const data = sanitizeInput(rawData);

		// Validate request body
		const { isValid, errors } = validateStaffCreation({
			firstName: data.firstName,
			lastName: data.lastName,
			middleName: data.middleName,
			suffix: data.suffix,
			personalEmail: data.personalEmail,
			roleId: data.roleId || DEFAULT_ROLE_ID
		});
		
		if (!isValid) {
			return res.status(400).json({ 
				success: false,
				message: 'Validation failed', 
				errors 
			});
		}

		const client = await getClient();
		try {
			await client.query('BEGIN');

			// Pre-check: ensure personal email is unique
			const personalExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE personal_email = $1', [data.personalEmail]);
			if (parseInt(personalExists.rows[0].count) > 0) {
				await client.query('ROLLBACK');
				return res.status(409).json({ 
					success: false,
					message: 'Personal email already exists' 
				});
			}

			// Generate identifiers and credentials
			const lydoId = await generateLYDOId();
			
			// Check if LYDO ID already exists
			const idExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE lydo_id = $1', [lydoId]);
			if (parseInt(idExists.rows[0].count) > 0) {
				await client.query('ROLLBACK');
				return res.status(409).json({ 
					success: false,
					message: 'Generated LYDO ID already exists. Please retry.' 
				});
			}
			
			const orgEmail = await generateOrgEmail(data.firstName, data.lastName);

			// Double-check: org email uniqueness
			const orgExists = await client.query('SELECT COUNT(*) AS count FROM "LYDO" WHERE email = $1', [orgEmail]);
			if (parseInt(orgExists.rows[0].count) > 0) {
				await client.query('ROLLBACK');
				return res.status(409).json({ 
					success: false,
					message: 'Generated org email already exists. Please retry.' 
				});
			}

			const password = generateSecurePassword(12);
			const passwordHash = await bcrypt.hash(password, 10);

			// Insert staff
			const insertSQL = `
				INSERT INTO "LYDO" (
					lydo_id, role_id, email, personal_email, password_hash,
					first_name, last_name, middle_name, suffix,
					is_active, email_verified, created_by, created_at, updated_at, deactivated
				) VALUES (
					$1, $2, $3, $4, $5,
					$6, $7, $8, $9,
					true, false, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false
				) RETURNING *
			`;
			const createdBy = req.user?.lydo_id || null;
			const insertParams = [
				lydoId, data.roleId || DEFAULT_ROLE_ID, orgEmail, data.personalEmail, passwordHash,
				data.firstName, data.lastName, data.middleName || null, data.suffix || null,
				createdBy
			];
			const result = await client.query(insertSQL, insertParams);
			const created = mapStaffRow(result.rows[0]);

			// CRITICAL: Create Users table entry for notifications system
			logger.debug('Creating Users table entry for notifications', { lydoId });
			const userType = (data.roleId === 'ROL001' || data.firstName === 'Admin') ? 'admin' : 'staff';
			
			let userResult;
			if (userType === 'admin') {
				userResult = await createUserForAdmin(lydoId, client);
			} else {
				userResult = await createUserForStaff(lydoId, client);
			}
			if (userResult?.rows?.[0]?.user_id) {
				logger.debug('Users table entry created successfully', { userId: userResult.rows[0].user_id, lydoId });
			}

			await client.query('COMMIT');

			// Fire-and-forget notifications/emails (don't block response)
			logger.debug('Attempting to send welcome notification', {
				lydoId,
				firstName: data.firstName,
				lastName: data.lastName,
				personalEmail: data.personalEmail,
				orgEmail,
				hasPassword: !!password,
				passwordLength: password ? password.length : 0,
				createdBy: createdBy || 'SYSTEM'
			});
			
			notificationService.sendWelcomeNotification({
				lydoId,
				firstName: data.firstName,
				lastName: data.lastName,
				personalEmail: data.personalEmail,
				orgEmail,
				password,
				createdBy: createdBy || 'SYSTEM'
			}).catch(err => logger.error('Welcome notification failed', { error: err.message, stack: err.stack, lydoId }));

			// Send admin notifications about staff creation (with req.user context fix)
			const currentUser = req.user;
			setTimeout(async () => {
				try {
					logger.debug('Sending staff creation notification', { userId: currentUser.id, userType: currentUser.userType, staffId: lydoId });
					await notificationService.notifyAdminsAboutStaffCreation(created, currentUser);
				} catch (notifError) {
					logger.error('Admin notification error', { error: notifError.message, stack: notifError.stack, staffId: lydoId });
				}
			}, 100);

			// OLD notification system removed - now using the new notifyAdminsAboutStaffCreation method above

			// Create audit log for staff creation
			const staffName = `${data.firstName} ${data.lastName}`;
			createAuditLog({
				userId: req.user?.id || 'SYSTEM',
				userType: req.user?.userType || 'admin',
				action: 'Create',
				resource: '/api/staff',
				resourceId: lydoId,
				resourceName: staffName,
				details: {
					staffName: staffName,
					resourceType: 'staff',
					roleId: data.roleId || DEFAULT_ROLE_ID,
					email: data.personalEmail
				},
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				status: 'success'
			}).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'CREATE', resourceType: 'staff' }));

			return res.status(201).json({
				success: true,
				message: 'Staff created successfully',
				credentials: { lydoId, orgEmail, password },
				staff: created
			});
		} catch (txErr) {
			await client.query('ROLLBACK');
			if (txErr.code === '23505') { // unique_violation
				const detail = txErr.detail || '';
				if (detail.includes('(personal_email)')) {
					return res.status(409).json({ 
						success: false,
						message: 'Personal email already exists' 
					});
				}
				if (detail.includes('(email)')) {
					return res.status(409).json({ 
						success: false,
						message: 'Org email already exists' 
					});
				}
				return res.status(409).json({ 
					success: false,
					message: 'Unique constraint violation' 
				});
			}
			logger.error('createStaff transaction error', { error: txErr.message, stack: txErr.stack });
			return res.status(500).json({ 
				success: false,
				message: 'Failed to create staff',
				error: process.env.NODE_ENV === 'development' ? txErr.message : 'Internal server error'
			});
		} finally {
			client.release();
		}
	} catch (error) {
		logger.error('createStaff error', { error: error.message, stack: error.stack });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to create staff',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

export const updateStaff = async (req, res) => {
	try {
		const { id } = req.params;
		
		// Validate ID format
		if (!/^LYDO\d{3}$/.test(id)) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid staff ID format' 
			});
		}

		const rawData = req.body || {};
		const data = sanitizeInput(rawData);

		const { isValid, errors } = validateStaffUpdate(data);
		if (!isValid) {
			return res.status(400).json({ 
				success: false,
				message: 'Validation failed', 
				errors 
			});
		}

		// Build dynamic update
		const fields = [];
		const values = [];
		let idx = 1;
		const setField = (col, val) => { fields.push(`${col} = $${idx}`); values.push(val); idx++; };

		if (data.firstName !== undefined) setField('first_name', data.firstName);
		if (data.lastName !== undefined) setField('last_name', data.lastName);
		if (data.middleName !== undefined) setField('middle_name', data.middleName || null);
		if (data.suffix !== undefined) setField('suffix', data.suffix || null);
		if (data.personalEmail !== undefined) setField('personal_email', data.personalEmail);

		if (fields.length === 0) {
			return res.status(400).json({ 
				success: false,
				message: 'No fields to update' 
			});
		}

		fields.push('updated_at = CURRENT_TIMESTAMP');
		const sql = `UPDATE "LYDO" SET ${fields.join(', ')} WHERE lydo_id = $${idx} RETURNING *`;
		values.push(id);

		const result = await query(sql, values);
		if (result.rows.length === 0) {
			return res.status(404).json({ 
				success: false,
				message: 'Staff not found' 
			});
		}

		// Send admin notifications about staff update (with req.user context fix)
		const currentUser = req.user;
		setTimeout(async () => {
			try {
				logger.debug('Sending staff update notification', { userId: currentUser.id, userType: currentUser.userType, staffId: req.params.id });
				// We need the original staff data for comparison, but for now just send updated data
				await notificationService.notifyAdminsAboutStaffUpdate(result.rows[0], {}, currentUser);
			} catch (notifError) {
				logger.error('Staff update notification error', { error: notifError.message, stack: notifError.stack, staffId: req.params.id });
			}
		}, 100);

		// Create audit log for staff update
		const updatedStaffName = `${result.rows[0].first_name} ${result.rows[0].last_name}`;
		createAuditLog({
			userId: req.user?.id || 'SYSTEM',
			userType: req.user?.userType || 'admin',
			action: 'Update',
			resource: '/api/staff',
			resourceId: id,
			resourceName: updatedStaffName,
			details: {
				staffName: updatedStaffName,
				resourceType: 'staff',
				roleId: result.rows[0].role_id
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			status: 'success'
		}).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'staff' }));

		return res.json({ 
			success: true,
			message: 'Staff updated successfully', 
			staff: mapStaffRow(result.rows[0]) 
		});
	} catch (error) {
		logger.error('updateStaff error', { error: error.message, stack: error.stack, staffId: req.params.id });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to update staff',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

export const updateStatus = async (req, res) => {
	try {
		const { id } = req.params;
		
		// Validate ID format
		if (!/^LYDO\d{3}$/.test(id)) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid staff ID format' 
			});
		}

		const rawData = req.body || {};
		const data = sanitizeInput(rawData);

		const { isValid, errors } = validateStatusUpdate({ status: data.status, reason: data.reason });
		if (!isValid) {
			return res.status(400).json({ 
				success: false,
				message: 'Validation failed', 
				errors 
			});
		}

		let sql, params;
		if (data.status === 'active') {
			sql = `UPDATE "LYDO" SET is_active = true, deactivated = false, deactivated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE lydo_id = $1 RETURNING *`;
			params = [id];
		} else {
			sql = `UPDATE "LYDO" SET is_active = false, deactivated = true, deactivated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE lydo_id = $1 RETURNING *`;
			params = [id];
		}

		const result = await query(sql, params);
		if (result.rows.length === 0) {
			return res.status(404).json({ 
				success: false,
				message: 'Staff not found' 
			});
		}

		// Send admin notifications about staff status change (with req.user context fix)
		const currentUser = req.user;
		const newStatus = data.status; // Capture status in closure scope
		setTimeout(async () => {
			try {
				logger.debug('Sending staff status change notification', { userId: currentUser.id, userType: currentUser.userType, staffId: req.params.id, status: newStatus });
				const oldStatus = newStatus === 'active' ? 'deactivated' : 'active';
				await notificationService.notifyAdminsAboutStaffStatusChange(result.rows[0], oldStatus, currentUser);
			} catch (notifError) {
				logger.error('Staff status notification error', { error: notifError.message, stack: notifError.stack, staffId: req.params.id, status: newStatus });
			}
		}, 100);

		// Create audit log for staff status update
		const statusStaffName = `${result.rows[0].first_name} ${result.rows[0].last_name}`;
		createAuditLog({
			userId: req.user?.id || 'SYSTEM',
			userType: req.user?.userType || 'admin',
			action: data.status === 'active' ? 'Activate' : 'Deactivate',
			resource: '/api/staff',
			resourceId: id,
			resourceName: statusStaffName,
			details: {
				staffName: statusStaffName,
				resourceType: 'staff',
				newStatus: data.status,
				roleId: result.rows[0].role_id
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			status: 'success'
		}).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'staff' }));

		return res.json({ 
			success: true,
			message: 'Status updated successfully', 
			staff: mapStaffRow(result.rows[0]) 
		});
	} catch (error) {
		logger.error('updateStatus error', { error: error.message, stack: error.stack, staffId: req.params.id });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to update status',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

export const deleteStaffSoft = async (req, res) => {
	try {
		const { id } = req.params;
		
		// Validate ID format
		if (!/^LYDO\d{3}$/.test(id)) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid staff ID format' 
			});
		}

		const result = await query(
			`UPDATE "LYDO" SET is_active = false, deactivated = true, deactivated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE lydo_id = $1 RETURNING *`,
			[id]
		);
		
		if (result.rows.length === 0) {
			return res.status(404).json({ 
				success: false,
				message: 'Staff not found' 
			});
		}

		// Send admin notifications about staff deletion (with req.user context fix)
		const currentUser = req.user;
		setTimeout(async () => {
			try {
				logger.debug('Sending staff deletion notification', { userId: currentUser.id, userType: currentUser.userType, staffId: req.params.id });
				await notificationService.notifyAdminsAboutStaffDeletion(result.rows[0], currentUser);
			} catch (notifError) {
				logger.error('Staff deletion notification error', { error: notifError.message, stack: notifError.stack, staffId: req.params.id });
			}
		}, 100);

		// Create audit log for staff soft deletion
		const deletedStaffName = `${result.rows[0].first_name} ${result.rows[0].last_name}`;
		createAuditLog({
			userId: req.user?.id || 'SYSTEM',
			userType: req.user?.userType || 'admin',
			action: 'Delete',
			resource: '/api/staff',
			resourceId: id,
			resourceName: deletedStaffName,
			details: {
				staffName: deletedStaffName,
				resourceType: 'staff',
				roleId: result.rows[0].role_id
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			status: 'success'
		}).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'UPDATE', resourceType: 'staff' }));

		return res.json({ 
			success: true,
			message: 'Staff soft-deleted successfully', 
			staff: mapStaffRow(result.rows[0]) 
		});
	} catch (error) {
		logger.error('deleteStaffSoft error', { error: error.message, stack: error.stack, staffId: req.params.id });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to delete staff',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

// NEW: Bulk operations
export const bulkUpdateStatus = async (req, res) => {
	try {
		const rawData = req.body || {};
		
		const data = sanitizeInput(rawData);

		const { isValid, errors } = validateBulkOperation(data);
		logger.debug('Bulk operation validation', { rawDataLength: rawData?.ids?.length, sanitizedCount: data?.ids?.length, isValid, errorCount: errors?.length });
		
		if (!isValid) {
			return res.status(400).json({ 
				success: false,
				message: 'Validation failed', 
				errors 
			});
		}

		const { ids, action, reason } = data;
		const client = await getClient();
		
		try {
			await client.query('BEGIN');
			
			let updateSQL, updateParams;
			const results = [];
			
			if (action === 'activate') {
				updateSQL = `UPDATE "LYDO" SET is_active = true, deactivated = false, deactivated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE lydo_id = $1 RETURNING *`;
			} else if (action === 'deactivate') {
				updateSQL = `UPDATE "LYDO" SET is_active = false, deactivated = true, deactivated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE lydo_id = $1 RETURNING *`;
			} else {
				throw new Error(`Invalid bulk action: ${action}`);
			}

			for (const id of ids) {
				const result = await client.query(updateSQL, [id]);
				if (result.rows.length > 0) {
					results.push(mapStaffRow(result.rows[0]));
				}
			}

			await client.query('COMMIT');

			// Send admin notifications about bulk staff operation (with req.user context fix)
			const currentUser = req.user;
			setTimeout(async () => {
				try {
					logger.debug('Sending bulk staff operation notification', { userId: currentUser.id, userType: currentUser.userType, action, count: ids.length });
					await notificationService.notifyAdminsAboutBulkStaffOperation(ids, action, currentUser);
				} catch (notifError) {
					logger.error('Bulk staff operation notification error', { error: notifError.message, stack: notifError.stack, action, count: ids.length });
				}
			}, 100);

			// Create audit log for bulk staff operation
			const bulkAction = action.charAt(0).toUpperCase() + action.slice(1); // Capitalize first letter
			const resourceName = `Staff Bulk ${bulkAction} - ${results.length} ${results.length === 1 ? 'member' : 'members'}`;
			
			createAuditLog({
				userId: req.user?.id || 'SYSTEM',
				userType: req.user?.userType || 'admin',
				action: `Bulk ${bulkAction}`,
				resource: '/api/staff',
				resourceId: null,
				resourceName: resourceName,
				details: {
					resourceType: 'staff',
					totalItems: ids.length,
					successCount: results.length,
					action: action
				},
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				status: 'success'
			}).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack, action: 'CREATE', resourceType: 'staff' }));

			return res.json({
				success: true,
				message: `Bulk ${action} completed successfully`,
				processed: results.length,
				staff: results
			});

		} catch (txErr) {
			await client.query('ROLLBACK');
			logger.error('bulkUpdateStatus transaction error', { error: txErr.message, stack: txErr.stack, action });
			return res.status(500).json({ 
				success: false,
				message: 'Failed to perform bulk operation',
				error: process.env.NODE_ENV === 'development' ? txErr.message : 'Internal server error'
			});
		} finally {
			client.release();
		}
	} catch (error) {
		logger.error('bulkUpdateStatus error', { error: error.message, stack: error.stack });
		return res.status(500).json({ 
			success: false,
			message: 'Failed to perform bulk operation',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};

// NEW: Export functionality
export const exportStaff = async (req, res) => {
	try {
		const { format = 'csv', status = 'all', selectedIds, logFormat } = req.query;
		// logFormat is the actual format exported (for logging), format is the response format
		const actualFormat = logFormat || format;
		
		logger.debug('Export request received', { format, actualFormat, status, hasSelectedIds: !!selectedIds, userId: req.user?.id });
		
		if (!['csv', 'json', 'pdf'].includes(format)) {
			return res.status(400).json({ 
				success: false,
				message: 'Invalid export format. Use "csv", "json", or "pdf"' 
			});
		}

		let whereClause = `WHERE role_id = '${DEFAULT_ROLE_ID}'`;
		let exportType = 'all';
		
		// If specific IDs are selected, filter by those IDs
		if (selectedIds && selectedIds.length > 0) {
			const idsArray = Array.isArray(selectedIds) ? selectedIds : selectedIds.split(',');
			
			// Handle both string IDs (like "LYDO002") and numeric IDs
			const sanitizedIds = idsArray
				.map(id => String(id).trim()) // Convert to string and trim whitespace
				.filter(id => id.length > 0);  // Remove empty strings
			
			if (sanitizedIds.length > 0) {
				// Use parameterized query for string IDs to prevent SQL injection
				const placeholders = sanitizedIds.map((_, index) => `$${index + 1}`).join(',');
				whereClause += ` AND lydo_id IN (${placeholders})`;
				exportType = 'selected';
				logger.debug('Exporting selected staff members', { count: sanitizedIds.length });
				
				// Store sanitized IDs for the query
				whereClause = { clause: whereClause, params: sanitizedIds };
			} else {
				logger.warn('selectedIds provided but no valid IDs found', { selectedIds });
			}
		} else {
			// Apply status filter only when not filtering by specific IDs
			if (status === 'active') {
				whereClause += ` AND is_active = true AND deactivated = false`;
				exportType = 'active';
			} else if (status === 'deactivated') {
				whereClause += ` AND (is_active = false OR deactivated = true)`;
				exportType = 'deactivated';
			}
			logger.debug('Exporting staff with status filter', { exportType, status });
		}

		let sql, result;
		
		// Handle parameterized query for selected IDs
		if (typeof whereClause === 'object' && whereClause.clause) {
			sql = `
				SELECT 
					lydo_id, first_name, last_name, middle_name, suffix,
					email, personal_email, is_active, deactivated,
					created_at, updated_at, deactivated_at
				FROM "LYDO" 
				${whereClause.clause}
				ORDER BY last_name, first_name
			`;
			result = await query(sql, whereClause.params);
		} else {
			sql = `
				SELECT 
					lydo_id, first_name, last_name, middle_name, suffix,
					email, personal_email, is_active, deactivated,
					created_at, updated_at, deactivated_at
				FROM "LYDO" 
				${whereClause}
				ORDER BY last_name, first_name
			`;
			result = await query(sql);
		}
		
		const staff = result.rows.map(mapStaffRow);
		logger.debug('Export query completed', { count: staff.length, exportType, format });

		// Debug: Log user info
		logger.debug('Export user context', { userId: req.user?.id || req.user?.lydo_id || req.user?.user_id || 'SYSTEM', userType: req.user?.userType || req.user?.user_type || 'admin' });

		// Create detailed export list for audit log (used in all formats)
		const exportedStaffNames = staff.map(s => `${s.firstName} ${s.lastName} (${s.lydoId})`);
		const staffList = exportedStaffNames.length <= 5 
			? exportedStaffNames.join(', ')
			: `${exportedStaffNames.slice(0, 5).join(', ')} and ${exportedStaffNames.length - 5} more`;

		// Prepare audit log data (before sending response)
		const userId = req.user?.id || req.user?.lydo_id || req.user?.user_id || 'SYSTEM';
		const userType = req.user?.userType || req.user?.user_type || 'admin';
		
		// Determine action: 'Bulk Export' for bulk exports (selectedIds), 'Export' for regular exports
		const action = exportType === 'selected' ? 'Bulk Export' : 'Export';
		
		// Create meaningful resource name for export
		const resourceName = `Staff Export - ${actualFormat.toUpperCase()} (${staff.length} ${staff.length === 1 ? 'member' : 'members'})`;
		
		logger.debug('Creating export audit log', { userId, userType, format: actualFormat, count: staff.length, action, exportType });

		if (format === 'json') {

			// Create audit log for JSON export (await before responding)
			try {
				const logId = await createAuditLog({
					userId: userId,
					userType: userType,
					action: action,
					resource: '/api/staff/export',
					resourceId: null,
					resourceName: resourceName,
					details: {
						resourceType: 'staff',
						reportType: 'staff',
						format: actualFormat,
						count: staff.length,
						exportType: exportType,
						status: status
					},
					ipAddress: req.ip,
					userAgent: req.get('User-Agent'),
					status: 'success',
					category: 'Data Export'
				});
				if (logId) {
					logger.debug('Export audit log created', { logId, format: 'json', count: staff.length });
				} else {
					logger.warn('Export audit log returned null', { format: 'json' });
				}
			} catch (err) {
				logger.error('Export audit log failed', { error: err.message, stack: err.stack, format: 'json' });
			}

			return res.json({
				success: true,
				exportedAt: new Date().toISOString(),
				total: staff.length,
				staff
			});
		} else if (format === 'csv') {
			// Generate CSV
			const csvHeaders = [
				'LYDO ID', 'First Name', 'Last Name', 'Middle Name', 'Suffix',
				'Email', 'Personal Email', 'Status', 'Created At', 'Updated At'
			];
			
			const csvRows = staff.map(s => [
				s.lydoId,
				s.firstName,
				s.lastName,
				s.middleName || '',
				s.suffix || '',
				s.email,
				s.personalEmail,
				s.isActive && !s.deactivated ? 'Active' : 'Inactive',
				s.createdAt,
				s.updatedAt
			]);

			const csvContent = [
				csvHeaders.join(','),
				...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
			].join('\n');

			// Create audit log for CSV export (BEFORE sending response)
			try {
				const logId = await createAuditLog({
					userId: userId,
					userType: userType,
					action: action,
					resource: '/api/staff/export',
					resourceId: null,
					resourceName: resourceName,
					details: {
						resourceType: 'staff',
						reportType: 'staff',
						format: actualFormat,
						count: staff.length,
						exportType: exportType,
						status: status
					},
					ipAddress: req.ip,
					userAgent: req.get('User-Agent'),
					status: 'success',
					category: 'Data Export'
				});
				if (logId) {
					logger.debug('Export audit log created', { logId, format: 'csv', count: staff.length });
				} else {
					logger.warn('Export audit log returned null', { format: 'csv' });
				}
			} catch (err) {
				logger.error('Export audit log failed', { error: err.message, stack: err.stack, format: 'csv' });
			}

			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="staff_export_${new Date().toISOString().split('T')[0]}.csv"`);
			
			return res.send(csvContent);
		} else if (format === 'pdf') {
			// Get PDF style from query parameter (default: 'official')
			const pdfStyle = req.query.style || 'official';
			
			// Streamed PDF response
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', `attachment; filename="staff_export_${pdfStyle}_${new Date().toISOString().split('T')[0]}.pdf"`);

			const doc = new PDFDocument({ margin: 36, size: 'A4' });
			doc.pipe(res);

			// Export info for PDF generators
			const exportInfo = {
				type: exportType,
				status: status,
				total: staff.length,
				generatedAt: new Date().toISOString()
			};

			// Dynamic PDF format selection
			switch (pdfStyle) {
				case 'modern':
					await generateModernFormat(doc, staff, exportInfo);
					break;
				case 'detailed':
					await generateDetailedFormat(doc, staff, exportInfo);
					break;
				case 'table':
					await generateTableFormat(doc, staff, exportInfo);
					break;
				case 'official':
				default:
					await generateOfficialFormat(doc, staff, exportInfo);
					break;
			}

			// Create audit log for PDF export (BEFORE ending document - await it)
			try {
				const logId = await createAuditLog({
					userId: userId,
					userType: userType,
					action: action,
					resource: '/api/staff/export',
					resourceId: null,
					resourceName: resourceName,
					details: {
						resourceType: 'staff',
						reportType: 'staff',
						format: actualFormat,
						count: staff.length,
						exportType: exportType,
						status: status,
						pdfStyle: pdfStyle
					},
					ipAddress: req.ip,
					userAgent: req.get('User-Agent'),
					status: 'success',
					category: 'Data Export'
				});
				if (logId) {
					logger.debug('Export audit log created', { logId, format: 'pdf', count: staff.length, pdfStyle });
				} else {
					logger.warn('Export audit log returned null', { format: 'pdf' });
				}
			} catch (err) {
				logger.error('Export audit log failed', { error: err.message, stack: err.stack, format: 'pdf' });
			}

			doc.end();
			return;
		}
	} catch (error) {
		logger.error('exportStaff error', { error: error.message, stack: error.stack, format, status });

		// Create audit log for failed export
		const userId = req.user?.id || req.user?.lydo_id || req.user?.user_id || 'SYSTEM';
		const userType = req.user?.userType || req.user?.user_type || 'admin';
		const resourceName = `Staff Export - Failed`;
		
		try {
			const logId = await createAuditLog({
				userId: userId,
				userType: userType,
				action: 'Export',
				resource: '/api/staff/export',
				resourceId: null,
				resourceName: resourceName,
				details: {
					resourceType: 'staff',
					reportType: 'staff',
					error: error.message,
					exportFailed: true
				},
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				status: 'error',
				errorMessage: error.message,
				category: 'Data Export'
			});
			if (logId) {
				logger.debug('Export error audit log created', { logId });
			} else {
				logger.warn('Export error audit log returned null');
			}
		} catch (err) {
			logger.error('Export error audit log failed', { error: err.message, stack: err.stack });
		}

		return res.status(500).json({ 
			success: false,
			message: 'Failed to export staff data',
			error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
		});
	}
};
