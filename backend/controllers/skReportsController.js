import { query } from '../config/database.js';
import universalAuditService from '../services/universalAuditService.js';
import universalNotificationService from '../services/universalNotificationService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import PDFDocument from 'pdfkit';
import { generateOfficialFormat, generateModernFormat, generateDetailedFormat, generateTableFormat } from '../utils/pdfFormats.js';

/**
 * SK Officials Reports & Analytics Controller
 * Handles reports, analytics, and export operations for SK Officials
 * Following Staff Management architecture pattern - Separated Concerns
 * Enhanced with Universal Audit and Notification Services
 */

// === EXPORT OPERATIONS ===

/**
 * Export SK Officials to CSV
 * GET /api/sk-officials/export/csv
 */
const exportSKOfficialsCSV = async (req, res) => {
  try {
    const { status, selectedIds, style, termId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramCounter = 1;

    // Apply filters
    if (selectedIds) {
      const ids = selectedIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        const placeholders = ids.map(() => `$${paramCounter++}`).join(',');
        whereClause += ` AND sk.sk_id IN (${placeholders})`;
        queryParams.push(...ids);
      }
    } else {
      if (status && status !== 'all') {
        if (status === 'active') {
          whereClause += ` AND sk.is_active = true`;
        } else if (status === 'inactive') {
          whereClause += ` AND sk.is_active = false`;
        }
      }
      if (termId) {
        whereClause += ` AND sk.term_id = $${paramCounter++}`;
        queryParams.push(termId);
      } else {
        // Default to active term if termId not provided
        whereClause += ` AND st.status = 'active'`;
      }
    }

    const exportQuery = `
      SELECT 
        sk.sk_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.personal_email,
        sk.email as org_email,
        sk.is_active,
        b.barangay_name,
        st.term_name,
        sk.created_at
      FROM "SK_Officials" sk
      LEFT JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Terms" st ON sk.term_id = st.term_id
      ${whereClause}
      ORDER BY sk.last_name, sk.first_name
    `;

    const result = await query(exportQuery, queryParams);
    
    // Convert to CSV
    const csvContent = convertToCSV(result.rows);
    
    // Log export activity using Universal Audit Service (following Staff Management pattern)
    const exportType = selectedIds ? 'selected' : (status !== 'all' ? status : (termId ? 'by-term' : 'all'));
    const exportedOfficialNames = result.rows.map(row => `${row.first_name} ${row.last_name}`);
    const officialsList = exportedOfficialNames.length <= 5 
      ? exportedOfficialNames.join(', ')
      : `${exportedOfficialNames.slice(0, 5).join(', ')} and ${exportedOfficialNames.length - 5} more`;

    universalAuditService.logCreation('reports', {
      reportType: 'SK Officials CSV Export',
      recordCount: result.rows.length,
      exportType: exportType,
      exportedOfficials: officialsList,
      filters: { status, termId: termId || 'current', selectedIds: selectedIds || 'none', style },
      fileName: 'sk_officials_export.csv',
      details: `Exported ${result.rows.length} SK Officials in CSV format (${exportType} export - status: ${status}): ${officialsList}`
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Export audit log failed:', err));

    // Notify admins (follow Staff pattern but without threshold to mirror desired behavior)
    if (result.rows.length > 0) {
      universalNotificationService.sendNotificationAsync('reports', 'creation', {
        reportType: 'SK Officials CSV Export',
        recordCount: result.rows.length,
        exportType: exportType,
        exportedOfficials: officialsList,
        fileName: 'sk_officials_export.csv'
      }, req.user);
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sk_officials_export.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting SK officials to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export SK officials',
      error: error.message
    });
  }
};

/**
 * Export SK Officials to PDF
 * GET /api/sk-officials/export/pdf
 */
const exportSKOfficialsPDF = async (req, res) => {
  try {
    const { status, selectedIds, style, termId } = req.query;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramCounter = 1;

    if (selectedIds) {
      const ids = selectedIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        const placeholders = ids.map(() => `$${paramCounter++}`).join(',');
        whereClause += ` AND sk.sk_id IN (${placeholders})`;
        queryParams.push(...ids);
      }
    } else {
      if (status && status !== 'all') {
        if (status === 'active') {
          whereClause += ` AND sk.is_active = true`;
        } else if (status === 'inactive') {
          whereClause += ` AND sk.is_active = false`;
        }
      }
      if (termId) {
        whereClause += ` AND sk.term_id = $${paramCounter++}`;
        queryParams.push(termId);
      } else {
        // Default to active term if termId not provided
        whereClause += ` AND st.status = 'active'`;
      }
    }

    const exportQuery = `
      SELECT 
        sk.sk_id,
        sk.first_name,
        sk.last_name,
        sk.middle_name,
        sk.suffix,
        sk.position,
        sk.personal_email,
        sk.email as org_email,
        sk.is_active,
        b.barangay_name,
        st.term_name,
        sk.created_at
      FROM "SK_Officials" sk
      LEFT JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Terms" st ON sk.term_id = st.term_id
      ${whereClause}
      ORDER BY sk.last_name, sk.first_name
    `;

    const result = await query(exportQuery, queryParams);

    // Streamed PDF response with shared staff PDF generators for consistent styling
    const pdfStyle = style || 'official';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sk_officials_${pdfStyle}.pdf"`);

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);

    // Map SK fields to the staff generator schema
    const mapped = result.rows.map(r => ({
      lydoId: r.sk_id,
      firstName: r.first_name,
      lastName: r.last_name,
      middleName: r.middle_name,
      suffix: r.suffix,
      email: r.org_email,
      personalEmail: r.personal_email,
      isActive: r.is_active,
      deactivated: r.is_active === false,
      createdAt: r.created_at
    }));

    const exportInfo = {
      type: selectedIds ? 'selected' : (status && status !== 'all' ? status : (termId ? 'by-term' : 'all')),
      status: status || 'all',
      total: mapped.length,
      generatedAt: new Date().toISOString()
    };

    switch (pdfStyle) {
      case 'modern':
        await generateModernFormat(doc, mapped, exportInfo);
        break;
      case 'detailed':
        await generateDetailedFormat(doc, mapped, exportInfo);
        break;
      case 'table':
        await generateTableFormat(doc, mapped, exportInfo);
        break;
      case 'official':
      default:
        await generateOfficialFormat(doc, mapped, exportInfo);
        break;
    }

    // Audit log and optional notification (large export)
    const exportType = selectedIds ? 'selected' : (status && status !== 'all' ? status : (termId ? 'by-term' : 'all'));
    const exportedOfficialNames = result.rows.map(r => `${r.first_name} ${r.last_name}`);
    const officialsList = exportedOfficialNames.length <= 5 ? exportedOfficialNames.join(', ') : `${exportedOfficialNames.slice(0,5).join(', ')} and ${exportedOfficialNames.length - 5} more`;

    // Activity log (parity with Staff)
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'EXPORT',
      resource: 'sk-officials',
      resourceId: selectedIds ? (Array.isArray(selectedIds) ? selectedIds.join(',') : selectedIds) : 'bulk',
      details: `Exported ${result.rows.length} SK Officials in PDF format (${exportType}${termId ? `, termId: ${termId}` : ''}${status && status !== 'all' ? `, status: ${status}` : ''}, style: ${pdfStyle})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    }).catch(err => console.error('Export audit log failed:', err));

    if (result.rows.length > 0) {
      universalNotificationService.sendNotificationAsync('reports', 'creation', {
        reportType: 'SK Officials PDF Export',
        recordCount: result.rows.length,
        exportType,
        exportedOfficials: officialsList,
        fileName: `sk_officials_${pdfStyle}.pdf`
      }, req.user);
    }

    doc.end();
  } catch (error) {
    console.error('Error exporting SK officials to PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export SK officials',
      error: error.message
    });
  }
};

/**
 * Export SK Officials to Excel
 * GET /api/sk-officials/export/excel
 */
const exportSKOfficialsExcel = async (req, res) => {
  try {
    // TODO: Implement Excel export similar to staff management
    res.status(501).json({
      success: false,
      message: 'Excel export not yet implemented'
    });
  } catch (error) {
    console.error('Error exporting SK officials to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export SK officials',
      error: error.message
    });
  }
};

// === ANALYTICS & REPORTS ===

/**
 * Get SK Officials by term
 * GET /api/sk-officials/reports/by-term
 */
const getSKOfficialsByTerm = async (req, res) => {
  try {
    const termQuery = `
      SELECT 
        st.term_id,
        st.term_name,
        st.start_date,
        st.end_date,
        st.status,
        COUNT(sk.sk_id) as total_officials,
        COUNT(CASE WHEN sk.is_active = true AND sk.account_access = true THEN 1 END) as active_officials,
        COUNT(CASE WHEN sk.is_active = true AND sk.account_access = true AND sk.position = 'SK Chairperson' THEN 1 END) as chairpersons,
        COUNT(CASE WHEN sk.is_active = true AND sk.account_access = true AND sk.position = 'SK Secretary' THEN 1 END) as secretaries,
        COUNT(CASE WHEN sk.is_active = true AND sk.account_access = true AND sk.position = 'SK Treasurer' THEN 1 END) as treasurers,
        COUNT(CASE WHEN sk.is_active = true AND sk.account_access = true AND sk.position = 'SK Councilor' THEN 1 END) as councilors
      FROM "SK_Terms" st
      LEFT JOIN "SK_Officials" sk ON st.term_id = sk.term_id
      GROUP BY st.term_id, st.term_name, st.start_date, st.end_date, st.status
      ORDER BY st.start_date DESC
    `;

    const result = await query(termQuery);

    // Log analytics report access using Universal Audit Service
    universalAuditService.logCreation('reports', {
      reportType: 'SK Officials by Term Analytics',
      recordCount: result.rows.length,
      reportData: 'Term-based statistics and breakdowns'
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Analytics audit log failed:', err));

    res.json({
      success: true,
      data: result.rows.map(row => ({
        termId: row.term_id,
        termName: row.term_name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        statistics: {
          totalOfficials: parseInt(row.total_officials),
          activeOfficials: parseInt(row.active_officials),
          byPosition: {
            chairpersons: parseInt(row.chairpersons),
            secretaries: parseInt(row.secretaries),
            treasurers: parseInt(row.treasurers),
            councilors: parseInt(row.councilors)
          }
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching SK officials by term:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK officials by term',
      error: error.message
    });
  }
};

/**
 * Get current term officials
 * GET /api/sk-officials/reports/current-term
 */
const getCurrentTermOfficials = async (req, res) => {
  try {
    const currentTermQuery = `
      SELECT 
        sk.*,
        b.barangay_name,
        st.term_name,
        st.start_date,
        st.end_date
      FROM "SK_Officials" sk
      LEFT JOIN "Barangay" b ON sk.barangay_id = b.barangay_id
      LEFT JOIN "SK_Terms" st ON sk.term_id = st.term_id
      WHERE st.status = 'active'
      ORDER BY b.barangay_name, sk.position, sk.last_name
    `;

    const result = await query(currentTermQuery);

    // Log current term report access using Universal Audit Service
    universalAuditService.logCreation('reports', {
      reportType: 'Current Term SK Officials Report',
      recordCount: result.rows.length,
      reportData: 'Active term officials with barangay assignments'
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Current term report audit log failed:', err));

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching current term officials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current term officials',
      error: error.message
    });
  }
};

/**
 * Get SK Officials by barangay
 * GET /api/sk-officials/reports/by-barangay
 */
const getSKOfficialsByBarangay = async (req, res) => {
  try {
    const barangayQuery = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        COUNT(sk.sk_id) as total_officials,
        COUNT(CASE WHEN sk.is_active = true THEN 1 END) as active_officials,
        COUNT(CASE WHEN sk.position = 'SK Chairperson' THEN 1 END) as has_chairperson,
        COUNT(CASE WHEN sk.position = 'SK Secretary' THEN 1 END) as has_secretary,
        COUNT(CASE WHEN sk.position = 'SK Treasurer' THEN 1 END) as has_treasurer,
        COUNT(CASE WHEN sk.position = 'SK Councilor' THEN 1 END) as councilors
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id
      LEFT JOIN "SK_Terms" st ON sk.term_id = st.term_id AND st.status = 'active'
      GROUP BY b.barangay_id, b.barangay_name
      ORDER BY b.barangay_name
    `;

    const result = await query(barangayQuery);

    // Log barangay analytics access using Universal Audit Service
    universalAuditService.logCreation('reports', {
      reportType: 'SK Officials by Barangay Analytics',
      recordCount: result.rows.length,
      reportData: 'Barangay-based statistics and position analysis'
    }, universalAuditService.createUserContext(req)).catch(err => console.error('Barangay analytics audit log failed:', err));

    res.json({
      success: true,
      data: result.rows.map(row => ({
        barangayId: row.barangay_id,
        barangayName: row.barangay_name,
        statistics: {
          totalOfficials: parseInt(row.total_officials),
          activeOfficials: parseInt(row.active_officials),
          positionsFilled: {
            hasChairperson: parseInt(row.has_chairperson) > 0,
            hasSecretary: parseInt(row.has_secretary) > 0,
            hasTreasurer: parseInt(row.has_treasurer) > 0,
            councilors: parseInt(row.councilors)
          }
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching SK officials by barangay:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK officials by barangay',
      error: error.message
    });
  }
};

/**
 * Get barangay positions summary
 * GET /api/sk-officials/reports/barangay-positions
 */
const getBarangayPositions = async (req, res) => {
  try {
    const positionsQuery = `
      SELECT 
        b.barangay_name,
        sk.position,
        COUNT(sk.sk_id) as count,
        string_agg(sk.first_name || ' ' || sk.last_name, ', ') as officials
      FROM "Barangay" b
      LEFT JOIN "SK_Officials" sk ON b.barangay_id = sk.barangay_id
      LEFT JOIN "SK_Terms" st ON sk.term_id = st.term_id AND st.status = 'active'
      WHERE sk.is_active = true
      GROUP BY b.barangay_id, b.barangay_name, sk.position
      ORDER BY b.barangay_name, sk.position
    `;

    const result = await query(positionsQuery);

    // Group by barangay
    const groupedData = {};
    result.rows.forEach(row => {
      if (!groupedData[row.barangay_name]) {
        groupedData[row.barangay_name] = {};
      }
      groupedData[row.barangay_name][row.position] = {
        count: parseInt(row.count),
        officials: row.officials ? row.officials.split(', ') : []
      };
    });

    res.json({
      success: true,
      data: groupedData
    });

  } catch (error) {
    console.error('Error fetching barangay positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch barangay positions',
      error: error.message
    });
  }
};

/**
 * Get all Barangays (for dropdowns/filters)
 * GET /api/barangays
 */
const getBarangays = async (req, res) => {
  try {
    const result = await query(`
      SELECT barangay_id, barangay_name
      FROM "Barangay"
      ORDER BY barangay_name ASC
    `);

    res.json({
      success: true,
      data: result.rows.map(r => ({ barangayId: r.barangay_id, barangayName: r.barangay_name }))
    });
  } catch (error) {
    console.error('Error fetching barangays:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch barangays', error: error.message });
  }
};

/**
 * Get available positions (positions that need to be filled)
 * GET /api/sk-officials/reports/available-positions
 */
const getAvailablePositions = async (req, res) => {
  try {
    const availableQuery = `
      SELECT 
        b.barangay_id,
        b.barangay_name,
        CASE 
          WHEN chairperson.sk_id IS NULL THEN 'SK Chairperson'
          WHEN secretary.sk_id IS NULL THEN 'SK Secretary' 
          WHEN treasurer.sk_id IS NULL THEN 'SK Treasurer'
          ELSE 'SK Councilor'
        END as available_position,
        CASE 
          WHEN chairperson.sk_id IS NULL THEN 1
          WHEN secretary.sk_id IS NULL THEN 1
          WHEN treasurer.sk_id IS NULL THEN 1
          ELSE GREATEST(0, 7 - COALESCE(councilor_count.count, 0))
        END as available_slots
      FROM "Barangay" b
      LEFT JOIN "SK_Terms" st ON st.status = 'active'
      LEFT JOIN "SK_Officials" chairperson ON b.barangay_id = chairperson.barangay_id 
        AND chairperson.position = 'SK Chairperson' 
        AND chairperson.term_id = st.term_id 
        AND chairperson.is_active = true
      LEFT JOIN "SK_Officials" secretary ON b.barangay_id = secretary.barangay_id 
        AND secretary.position = 'SK Secretary' 
        AND secretary.term_id = st.term_id 
        AND secretary.is_active = true
      LEFT JOIN "SK_Officials" treasurer ON b.barangay_id = treasurer.barangay_id 
        AND treasurer.position = 'SK Treasurer' 
        AND treasurer.term_id = st.term_id 
        AND treasurer.is_active = true
      LEFT JOIN (
        SELECT barangay_id, COUNT(*) as count
        FROM "SK_Officials" sk
        JOIN "SK_Terms" st ON sk.term_id = st.term_id AND st.status = 'active'
        WHERE sk.position = 'SK Councilor' AND sk.is_active = true
        GROUP BY barangay_id
      ) councilor_count ON b.barangay_id = councilor_count.barangay_id
      ORDER BY b.barangay_name
    `;

    const result = await query(availableQuery);

    res.json({
      success: true,
      data: result.rows.filter(row => row.available_slots > 0)
    });

  } catch (error) {
    console.error('Error fetching available positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available positions',
      error: error.message
    });
  }
};

/**
 * Get SK Official history
 * GET /api/sk-officials/reports/history/:id
 */
const getSKOfficialHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get audit logs for this SK official
    const historyQuery = `
      SELECT 
        al.log_id,
        al.action,
        al.details,
        al.ip_address,
        al.user_agent,
        al.status,
        al.created_at,
        u.user_type as performed_by_type,
        COALESCE(l.first_name || ' ' || l.last_name, sk.first_name || ' ' || sk.last_name, 'System') as performed_by_name
      FROM "Activity_Logs" al
      LEFT JOIN "Users" u ON al.user_id = u.user_id
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
      LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
      WHERE al.resource = 'sk-officials' AND al.resource_id = $1
      ORDER BY al.created_at DESC
      LIMIT 100
    `;

    const result = await query(historyQuery, [id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching SK official history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK official history',
      error: error.message
    });
  }
};

/**
 * Get SK Official activities
 * GET /api/sk-officials/reports/activities
 */
const getSKOfficialActivities = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      action,
      limit = 50,
      offset = 0 
    } = req.query;

    let whereClause = `WHERE al.resource = 'sk-officials'`;
    const queryParams = [];
    let paramCounter = 1;

    if (startDate) {
      whereClause += ` AND al.created_at >= $${paramCounter}`;
      queryParams.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      whereClause += ` AND al.created_at <= $${paramCounter}`;
      queryParams.push(endDate);
      paramCounter++;
    }

    if (action) {
      whereClause += ` AND al.action = $${paramCounter}`;
      queryParams.push(action);
      paramCounter++;
    }

    const activitiesQuery = `
      SELECT 
        al.log_id,
        al.action,
        al.resource_id,
        al.details,
        al.status,
        al.created_at,
        u.user_type as performed_by_type,
        COALESCE(l.first_name || ' ' || l.last_name, sk.first_name || ' ' || sk.last_name, 'System') as performed_by_name,
        target_sk.first_name || ' ' || target_sk.last_name as target_official_name
      FROM "Activity_Logs" al
      LEFT JOIN "Users" u ON al.user_id = u.user_id
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
      LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
      LEFT JOIN "SK_Officials" target_sk ON al.resource_id = target_sk.sk_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(parseInt(limit), parseInt(offset));
    const result = await query(activitiesQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Activity_Logs" al
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        activities: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching SK official activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SK official activities',
      error: error.message
    });
  }
};

// === HELPER FUNCTIONS ===

/**
 * Convert data to CSV format
 */
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = [
    'SK ID',
    'First Name',
    'Last Name', 
    'Middle Name',
    'Suffix',
    'Position',
    'Barangay',
    'Personal Email',
    'Organization Email',
    'Status',
    'Term',
    'Created At'
  ];
  
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = [
      row.sk_id,
      row.first_name,
      row.last_name,
      row.middle_name || '',
      row.suffix || '',
      row.position,
      row.barangay_name,
      row.personal_email,
      row.org_email,
      row.is_active ? 'Active' : 'Inactive',
      row.term_name,
      new Date(row.created_at).toLocaleDateString()
    ].map(value => {
      // Escape values that contain commas
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

export default {
  // Export operations
  exportSKOfficialsCSV,
  exportSKOfficialsPDF,
  exportSKOfficialsExcel,
  
  // Analytics and reports
  getSKOfficialsByTerm,
  getCurrentTermOfficials,
  getSKOfficialsByBarangay,
  getBarangayPositions,
  getBarangays,
  getAvailablePositions,
  
  // Audit & History
  getSKOfficialHistory,
  getSKOfficialActivities
};
