/**
 * Activity Log Message Generator
 * Generates human-readable messages for activity logs
 */

import { query } from '../config/database.js';

/**
 * Format user role for display
 */
const formatUserRole = (userType) => {
  const roleMap = {
    'admin': 'Admin',
    'lydo_staff': 'LYDO Staff',
    'sk_official': 'SK Official',
    'youth': 'Youth',
    'anonymous': 'System',
    'system': 'System'
  };
  return roleMap[userType] || userType;
};

/**
 * Get user name from database
 */
const getUserName = async (userId, userType) => {
  if (!userId || userId === 'SYSTEM' || userId === 'anonymous') {
    return 'System';
  }

  try {
    if (userType === 'admin' || userType === 'lydo_staff') {
      const result = await query(
        'SELECT first_name, last_name FROM "LYDO" WHERE lydo_id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        return `${result.rows[0].first_name} ${result.rows[0].last_name}`;
      }
    } else if (userType === 'sk_official') {
      const result = await query(
        'SELECT first_name, last_name FROM "SK_Officials" WHERE sk_id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        return `${result.rows[0].first_name} ${result.rows[0].last_name}`;
      }
    } else if (userType === 'youth') {
      const result = await query(
        'SELECT first_name, last_name FROM "Youth_Profiling" WHERE youth_id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        return `${result.rows[0].first_name} ${result.rows[0].last_name}`;
      }
    }
  } catch (error) {
    console.error('Error fetching user name:', error);
  }

  return 'Unknown User';
};

/**
 * Generate activity log message
 * @param {string} action - Action code (e.g., 'CREATE_SURVEY_BATCH')
 * @param {object} userInfo - { userId, userType }
 * @param {object} resourceInfo - Resource details (name, id, etc.)
 * @param {object} details - Additional details from the log
 * @returns {Promise<string>} Generated message
 */
export const generateActivityMessage = async (action, userInfo, resourceInfo = {}, details = {}) => {
  const userId = userInfo?.userId || userInfo?.id;
  const userType = userInfo?.userType || userInfo?.user_type || 'anonymous';
  
  // Get user name (try from details first, then fetch from DB)
  let userName = details?.userName || details?.user_name;
  if (!userName && userId && userId !== 'SYSTEM' && userId !== 'anonymous') {
    userName = await getUserName(userId, userType);
  } else if (!userName) {
    userName = 'System';
  }

  const userRole = formatUserRole(userType);

  // Message templates by action
  const templates = {
    // Survey Batch Operations
    'CREATE_SURVEY_BATCH': `${userRole} ${userName} created survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'UPDATE_SURVEY_BATCH': `${userRole} ${userName} updated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'DELETE_SURVEY_BATCH': `${userRole} ${userName} deleted survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'UPDATE_SURVEY_BATCH_STATUS': `${userRole} ${userName} changed status of survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' to '${details.newStatus || details.status || 'Unknown'}'`,
    'BULK_UPDATE_SURVEY_BATCH_STATUS': `${userRole} ${userName} updated status of ${details.totalItems || details.count || 'multiple'} survey batches`,
    'PAUSE_SURVEY_BATCH': `${userRole} ${userName} paused survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'RESUME_SURVEY_BATCH': `${userRole} ${userName} resumed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'ACTIVATE_SURVEY_BATCH': `${userRole} ${userName} activated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'CLOSE_SURVEY_BATCH': `${userRole} ${userName} closed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'FORCE_ACTIVATE_SURVEY_BATCH': `${userRole} ${userName} force activated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' (start date adjusted)`,
    'FORCE_CLOSE_SURVEY_BATCH': `${userRole} ${userName} force closed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,

    // Validation Operations
    // Old format (keep for backward compatibility)
    'VALIDATE_SURVEY_RESPONSE': details.resourceType === 'survey-response'
      ? `${userRole} ${userName} approved survey response for ${resourceInfo.name || resourceInfo.youthName || details.youthName || 'youth'}`
      : `${userRole} ${userName} validated survey response ${resourceInfo.youthName ? `for Youth ${resourceInfo.youthName}` : details.youthName ? `for Youth ${details.youthName}` : ''}`,
    'REJECT_SURVEY_RESPONSE': details.resourceType === 'survey-response'
      ? `${userRole} ${userName} rejected survey response for ${resourceInfo.name || resourceInfo.youthName || details.youthName || 'youth'}`
      : `${userRole} ${userName} rejected survey response ${resourceInfo.youthName ? `for Youth ${resourceInfo.youthName}` : details.youthName ? `for Youth ${details.youthName}` : ''}`,
    'BULK_VALIDATE_SURVEY_RESPONSES': details.resourceType === 'survey-response'
      ? `${userRole} ${userName} approved ${details.successCount || details.totalItems || details.count || 'multiple'} survey responses`
      : `${userRole} ${userName} validated ${details.totalItems || details.successCount || details.count || 'multiple'} survey responses`,
    'BULK_REJECT_SURVEY_RESPONSES': details.resourceType === 'survey-response'
      ? `${userRole} ${userName} rejected ${details.successCount || details.totalItems || details.count || 'multiple'} survey responses`
      : `${userRole} ${userName} rejected ${details.totalItems || details.count || 'multiple'} survey responses`,
    // New title case format
    'Approve': (details.resourceType === 'validation' || details.resourceType === 'survey-response')
      ? `${userRole} ${userName} approved survey response for ${resourceInfo.name || resourceInfo.youthName || details.youthName || 'youth'}`
      : `${userRole} ${userName} approved ${details.resourceType || 'resource'}`,
    'Reject': (details.resourceType === 'validation' || details.resourceType === 'survey-response')
      ? `${userRole} ${userName} rejected survey response for ${resourceInfo.name || resourceInfo.youthName || details.youthName || 'youth'}`
      : `${userRole} ${userName} rejected ${details.resourceType || 'resource'}`,
    'Bulk Approve': (details.resourceType === 'validation' || details.resourceType === 'survey-response')
      ? `${userRole} ${userName} approved ${details.successCount || details.totalItems || details.count || 'multiple'} survey responses`
      : `${userRole} ${userName} approved ${details.successCount || details.totalItems || details.count || 'multiple'} ${details.resourceType || 'items'}`,
    'Bulk Reject': (details.resourceType === 'validation' || details.resourceType === 'survey-response')
      ? `${userRole} ${userName} rejected ${details.successCount || details.totalItems || details.count || 'multiple'} survey responses`
      : `${userRole} ${userName} rejected ${details.successCount || details.totalItems || details.count || 'multiple'} ${details.resourceType || 'items'}`,

    // Staff Management (support both old uppercase and new title case)
    'CREATE': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} created staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} created staff member`,
    'Create': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} created staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} created staff member`,
    'UPDATE': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} updated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} updated staff member`,
    'Update': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} updated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} updated staff member`,
    'DELETE': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} deleted staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} deleted staff member`,
    'Delete': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} deleted staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} deleted staff member`,
    'ACTIVATE': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} activated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} activated staff member`,
    'Activate': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} activated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} activated staff member`,
    'DEACTIVATE': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} deactivated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} deactivated staff member`,
    'Deactivate': details.staffName || resourceInfo.name
      ? `${userRole} ${userName} deactivated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} deactivated staff member`,
    'BULK_ACTIVATE': `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'Bulk Activate': `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'BULK_DEACTIVATE': `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'Bulk Deactivate': `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'BULK_CREATE': `${userRole} ${userName} created ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'Bulk Create': `${userRole} ${userName} created ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'BULK_UPDATE': `${userRole} ${userName} updated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'Bulk Update': `${userRole} ${userName} updated ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'BULK_DELETE': `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'Bulk Delete': `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} staff members`,
    'BULK_IMPORT': `${userRole} ${userName} imported ${details.totalItems || details.successCount || details.count || 'multiple'} staff members${details.fileName ? ` from '${details.fileName}'` : ''}`,
    'Bulk Import': `${userRole} ${userName} imported ${details.successCount || details.totalItems || details.count || 'multiple'} staff members${details.fileName ? ` from '${details.fileName}'` : ''}`,

    // Voter Management
    'CREATE': details.voterName || resourceInfo.name
      ? (details.resourceType === 'voter' 
        ? `${userRole} ${userName} created voter '${details.voterName || resourceInfo.name}'`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} created staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} created ${details.resourceType || 'resource'}`)
      : (details.resourceType === 'voter'
        ? `${userRole} ${userName} created voter`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} created staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} created staff member`),
    'Update': details.resourceType === 'voter'
      ? (details.voterName || resourceInfo.name
        ? `${userRole} ${userName} updated voter '${details.voterName || resourceInfo.name}'`
        : `${userRole} ${userName} updated voter`)
      : details.resourceType === 'council-role'
      ? `${userRole} ${userName} updated council role '${resourceInfo.name || details.role_name || 'Unknown'}'`
      : details.resourceType === 'council-member'
      ? `${userRole} ${userName} updated council member '${resourceInfo.name || details.member_name || 'Unknown'}'`
      : details.resourceType === 'council-page'
      ? `${userRole} ${userName} updated council page settings`
      : details.staffName || resourceInfo.name
      ? `${userRole} ${userName} updated staff member '${details.staffName || resourceInfo.name}'`
      : `${userRole} ${userName} updated staff member`,
    'Archive': details.resourceType === 'voter'
      ? (details.voterName || resourceInfo.name
        ? `${userRole} ${userName} archived voter '${details.voterName || resourceInfo.name}'`
        : `${userRole} ${userName} archived voter`)
      : details.resourceType === 'youth'
      ? (details.youthName || resourceInfo.name
        ? `${userRole} ${userName} archived youth '${details.youthName || resourceInfo.name}'`
        : `${userRole} ${userName} archived youth`)
      : `${userRole} ${userName} archived ${details.resourceType || 'resource'}`,
    'Restore': details.resourceType === 'voter'
      ? (details.voterName || resourceInfo.name
        ? `${userRole} ${userName} restored voter '${details.voterName || resourceInfo.name}'`
        : `${userRole} ${userName} restored voter`)
      : details.resourceType === 'youth'
      ? (details.youthName || resourceInfo.name
        ? `${userRole} ${userName} unarchived youth '${details.youthName || resourceInfo.name}'`
        : `${userRole} ${userName} unarchived youth`)
      : `${userRole} ${userName} restored ${details.resourceType || 'resource'}`,
    'Bulk Import': details.resourceType === 'voter'
      ? `${userRole} ${userName} imported ${details.successCount || details.totalItems || details.count || 'multiple'} voters${details.fileName ? ` from '${details.fileName}'` : ''}`
      : `${userRole} ${userName} imported ${details.successCount || details.totalItems || details.count || 'multiple'} staff members${details.fileName ? ` from '${details.fileName}'` : ''}`,
    'Export': details.resourceType === 'voter'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} voters as ${(details.format || 'CSV').toUpperCase()}`
      : details.resourceType === 'youth'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} youth as ${(details.format || 'CSV').toUpperCase()}`
      : details.resourceType === 'survey-batch' || details.reportType === 'survey-batches'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} survey batches as ${(details.format || 'CSV').toUpperCase()}`
      : `${userRole} ${userName} exported ${details.resourceType || 'data'}`,
    'Bulk Export': details.resourceType === 'voter'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} selected voters as ${(details.format || 'CSV').toUpperCase()}`
      : details.resourceType === 'youth'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} selected youth as ${(details.format || 'CSV').toUpperCase()}`
      : details.resourceType === 'survey-batch' || details.reportType === 'survey-batches'
      ? `${userRole} ${userName} exported ${details.count || 'multiple'} selected survey batches as ${(details.format || 'CSV').toUpperCase()}`
      : `${userRole} ${userName} exported ${details.count || 'multiple'} selected items as ${(details.format || 'CSV').toUpperCase()}`,
    'Bulk Archive': details.resourceType === 'voter'
      ? `${userRole} ${userName} archived ${details.successCount || details.totalItems || details.count || 'multiple'} voters`
      : details.resourceType === 'youth'
      ? `${userRole} ${userName} archived ${details.successCount || details.totalItems || details.count || 'multiple'} youth`
      : `${userRole} ${userName} archived ${details.successCount || details.totalItems || details.count || 'multiple'} items`,
    'Bulk Restore': details.resourceType === 'voter'
      ? `${userRole} ${userName} restored ${details.successCount || details.totalItems || details.count || 'multiple'} voters`
      : details.resourceType === 'youth'
      ? `${userRole} ${userName} unarchived ${details.successCount || details.totalItems || details.count || 'multiple'} youth`
      : `${userRole} ${userName} restored ${details.successCount || details.totalItems || details.count || 'multiple'} items`,

    // SK Management (support both old uppercase and new title case)
    'CREATE_SK_OFFICIAL': details.skName || resourceInfo.name
      ? `${userRole} ${userName} created SK official '${details.skName || resourceInfo.name}'${details.barangayName || resourceInfo.barangay ? ` for ${details.barangayName || resourceInfo.barangay}` : ''}`
      : `${userRole} ${userName} created SK official`,
    'Create': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} created survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : details.resourceType === 'council-role'
      ? `${userRole} ${userName} created council role '${resourceInfo.name || details.role_name || 'Unknown'}'`
      : details.resourceType === 'council-member'
      ? `${userRole} ${userName} added '${resourceInfo.name || details.member_name || 'Unknown'}' as '${details.role_name || 'member'}' to council`
      : details.resourceType === 'council-page'
      ? `${userRole} ${userName} updated council page settings`
      : details.skName || resourceInfo.name
      ? `${userRole} ${userName} created SK official '${details.skName || resourceInfo.name}'${details.barangayName || resourceInfo.barangay ? ` for ${details.barangayName || resourceInfo.barangay}` : ''}`
      : `${userRole} ${userName} created SK official`,
    'UPDATE_SK_OFFICIAL': details.skName || resourceInfo.name
      ? `${userRole} ${userName} updated SK official '${details.skName || resourceInfo.name}'`
      : `${userRole} ${userName} updated SK official`,
    'Update': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} updated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : details.resourceType === 'council-role'
      ? `${userRole} ${userName} updated council role '${resourceInfo.name || details.role_name || 'Unknown'}'`
      : details.resourceType === 'council-member'
      ? `${userRole} ${userName} updated council member '${resourceInfo.name || details.member_name || 'Unknown'}'`
      : details.resourceType === 'council-page'
      ? `${userRole} ${userName} updated council page settings`
      : details.skName || resourceInfo.name
      ? `${userRole} ${userName} updated SK official '${details.skName || resourceInfo.name}'`
      : `${userRole} ${userName} updated SK official`,
    'Upload': details.resourceType === 'council-page'
      ? (details.changes && details.changes.includes('Added'))
        ? `${userRole} ${userName} uploaded ${details.changes.split(', ').filter(c => c.includes('Added')).map(c => c.toLowerCase().replace('added ', 'hero ')).join(', ')} to council page`
        : details.heroIndex
        ? `${userRole} ${userName} uploaded hero ${details.heroIndex} to council page`
        : `${userRole} ${userName} uploaded hero image(s) to council page`
      : `${userRole} ${userName} uploaded ${details.resourceType || 'resource'}`,
    'Replace': details.resourceType === 'council-page'
      ? (details.changes && details.changes.includes('Updated'))
        ? `${userRole} ${userName} replaced ${details.changes.split(', ').filter(c => c.includes('Updated')).map(c => c.toLowerCase().replace('updated ', 'hero ')).join(', ')} on council page`
        : details.heroIndex
        ? `${userRole} ${userName} replaced hero ${details.heroIndex} on council page`
        : `${userRole} ${userName} replaced hero image(s) on council page`
      : `${userRole} ${userName} replaced ${details.resourceType || 'resource'}`,
    'Remove': details.resourceType === 'council-page'
      ? (details.changes && details.changes.includes('Removed'))
        ? `${userRole} ${userName} removed ${details.changes.split(', ').filter(c => c.includes('Removed')).map(c => c.toLowerCase().replace('removed ', 'hero ')).join(', ')} from council page`
        : details.heroIndex
        ? `${userRole} ${userName} removed hero ${details.heroIndex} from council page`
        : `${userRole} ${userName} removed hero image(s) from council page`
      : details.resourceType === 'council-member'
      ? `${userRole} ${userName} removed '${resourceInfo.name || details.member_name || 'Unknown'}' from council`
      : `${userRole} ${userName} removed ${details.resourceType || 'resource'}`,
    'DELETE_SK_OFFICIAL': details.skName || resourceInfo.name
      ? `${userRole} ${userName} deleted SK official '${details.skName || resourceInfo.name}'`
      : `${userRole} ${userName} deleted SK official`,
    'Delete': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} deleted survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : details.resourceType === 'council-role'
      ? `${userRole} ${userName} deleted council role '${resourceInfo.name || details.role_name || 'Unknown'}'`
      : details.resourceType === 'council-member'
      ? `${userRole} ${userName} removed '${resourceInfo.name || details.member_name || 'Unknown'}' from council`
      : details.skName || resourceInfo.name
      ? `${userRole} ${userName} deleted SK official '${details.skName || resourceInfo.name}'`
      : `${userRole} ${userName} deleted SK official`,
    'ACTIVATE': details.termName || resourceInfo.name
      ? (details.resourceType === 'survey-batch'
        ? `${userRole} ${userName} activated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
        : details.resourceType === 'sk-terms' 
        ? `${userRole} ${userName} activated SK term '${details.termName || resourceInfo.name}'`
        : details.skName || details.officialName
        ? `${userRole} ${userName} activated SK official '${details.skName || details.officialName || resourceInfo.name}'${details.reason ? ` - ${details.reason}` : details.accountAccess === 'enabled' ? ' (account access enabled)' : ''}`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} activated staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} activated ${details.resourceType || 'resource'}`)
      : (details.resourceType === 'survey-batch'
        ? `${userRole} ${userName} activated survey batch`
        : details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} activated SK term`
        : details.resourceType === 'sk-officials'
        ? `${userRole} ${userName} activated SK official`
        : `${userRole} ${userName} activated ${details.resourceType || 'resource'}`),
    'Activate': details.termName || resourceInfo.name
      ? (details.resourceType === 'survey-batch'
        ? `${userRole} ${userName} activated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
        : details.resourceType === 'sk-terms' 
        ? `${userRole} ${userName} activated SK term '${details.termName || resourceInfo.name}'`
        : details.skName || details.officialName
        ? `${userRole} ${userName} activated SK official '${details.skName || details.officialName || resourceInfo.name}'${details.reason ? ` - ${details.reason}` : details.accountAccess === 'enabled' ? ' (account access enabled)' : ''}`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} activated staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} activated ${details.resourceType || 'resource'}`)
      : (details.resourceType === 'survey-batch'
        ? `${userRole} ${userName} activated survey batch`
        : details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} activated SK term`
        : details.resourceType === 'sk-officials'
        ? `${userRole} ${userName} activated SK official`
        : `${userRole} ${userName} activated ${details.resourceType || 'resource'}`),
    'DEACTIVATE': details.termName || resourceInfo.name
      ? (details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} deactivated SK term '${details.termName || resourceInfo.name}'`
        : details.skName || details.officialName
        ? `${userRole} ${userName} deactivated SK official '${details.skName || details.officialName || resourceInfo.name}'${details.reason ? ` - ${details.reason}` : details.accountAccess === 'disabled' ? ' (account access disabled)' : ''}`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} deactivated staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} deactivated ${details.resourceType || 'resource'}`)
      : (details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} deactivated SK term`
        : details.resourceType === 'sk-officials'
        ? `${userRole} ${userName} deactivated SK official`
        : `${userRole} ${userName} deactivated ${details.resourceType || 'resource'}`),
    'Deactivate': details.termName || resourceInfo.name
      ? (details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} deactivated SK term '${details.termName || resourceInfo.name}'`
        : details.skName || details.officialName
        ? `${userRole} ${userName} deactivated SK official '${details.skName || details.officialName || resourceInfo.name}'${details.reason ? ` - ${details.reason}` : details.accountAccess === 'disabled' ? ' (account access disabled)' : ''}`
        : details.staffName || resourceInfo.name
        ? `${userRole} ${userName} deactivated staff member '${details.staffName || resourceInfo.name}'`
        : `${userRole} ${userName} deactivated ${details.resourceType || 'resource'}`)
      : (details.resourceType === 'sk-terms'
        ? `${userRole} ${userName} deactivated SK term`
        : details.resourceType === 'sk-officials'
        ? `${userRole} ${userName} deactivated SK official`
        : `${userRole} ${userName} deactivated ${details.resourceType || 'resource'}`),
    'BULK_ACTIVATE': `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} SK officials`,
    'Bulk Activate': `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} SK officials`,
    'BULK_DEACTIVATE': `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} SK officials`,
    'Bulk Deactivate': `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} SK officials`,
    'BULK_IMPORT': `${userRole} ${userName} imported ${details.totalItems || details.successCount || details.count || 'multiple'} SK officials${details.fileName ? ` from '${details.fileName}'` : ''}`,
    'Bulk Import': `${userRole} ${userName} imported ${details.successCount || details.totalItems || details.count || 'multiple'} SK officials${details.fileName ? ` from '${details.fileName}'` : ''}`,

    // Youth Management (support both old uppercase and new title case)
    'ARCHIVE_YOUTH': details.youthName || resourceInfo.name
      ? `${userRole} ${userName} archived youth '${details.youthName || resourceInfo.name}'`
      : `${userRole} ${userName} archived youth`,
    'Archive': details.youthName || resourceInfo.name
      ? `${userRole} ${userName} archived youth '${details.youthName || resourceInfo.name}'`
      : `${userRole} ${userName} archived youth`,
    'UNARCHIVE_YOUTH': details.youthName || resourceInfo.name
      ? `${userRole} ${userName} unarchived youth '${details.youthName || resourceInfo.name}'`
      : `${userRole} ${userName} unarchived youth`,
    'Unarchive': details.youthName || resourceInfo.name
      ? `${userRole} ${userName} unarchived youth '${details.youthName || resourceInfo.name}'`
      : `${userRole} ${userName} unarchived youth`,
    'BULK_ARCHIVE': `${userRole} ${userName} archived ${details.totalItems || details.successCount || details.count || 'multiple'} youth`,
    'Bulk Archive': `${userRole} ${userName} archived ${details.totalItems || details.successCount || details.count || 'multiple'} youth`,
    'BULK_UNARCHIVE': `${userRole} ${userName} unarchived ${details.totalItems || details.successCount || details.count || 'multiple'} youth`,
    'Bulk Unarchive': `${userRole} ${userName} unarchived ${details.totalItems || details.successCount || details.count || 'multiple'} youth`,

    // SK Term Management
    'FORCE_ACTIVATE': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force activated SK term '${details.termName || resourceInfo.name}' (start date adjusted to today)`
      : `${userRole} ${userName} force activated SK term (start date adjusted to today)`,
    'Force Activate': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force activated SK term '${details.termName || resourceInfo.name}' (start date adjusted to today)`
      : `${userRole} ${userName} force activated SK term (start date adjusted to today)`,
    'COMPLETE': details.termName || resourceInfo.name
      ? `${userRole} ${userName} completed SK term '${details.termName || resourceInfo.name}'`
      : `${userRole} ${userName} completed SK term`,
    'Complete': details.termName || resourceInfo.name
      ? `${userRole} ${userName} completed SK term '${details.termName || resourceInfo.name}'`
      : `${userRole} ${userName} completed SK term`,
    'EXTEND': details.termName || resourceInfo.name
      ? `${userRole} ${userName} extended SK term '${details.termName || resourceInfo.name}' (end date: ${details.newEndDate || 'updated'})`
      : `${userRole} ${userName} extended SK term`,
    'Extend': details.termName || resourceInfo.name
      ? `${userRole} ${userName} extended SK term '${details.termName || resourceInfo.name}' (end date: ${details.newEndDate || 'updated'})`
      : `${userRole} ${userName} extended SK term`,
    'FORCE_EXTEND': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force extended SK term '${details.termName || resourceInfo.name}' (end date: ${details.newEndDate || 'updated'}, bypassed validations)`
      : `${userRole} ${userName} force extended SK term (bypassed validations)`,
    'Force Extend': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force extended SK term '${details.termName || resourceInfo.name}' (end date: ${details.newEndDate || 'updated'}, bypassed validations)`
      : `${userRole} ${userName} force extended SK term (bypassed validations)`,
    'FORCE_COMPLETE': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force completed SK term '${details.termName || resourceInfo.name}' (end date adjusted to today, bypassed validations)`
      : `${userRole} ${userName} force completed SK term (bypassed validations)`,
    'Force Complete': details.termName || resourceInfo.name
      ? `${userRole} ${userName} force completed SK term '${details.termName || resourceInfo.name}' (end date adjusted to today, bypassed validations)`
      : `${userRole} ${userName} force completed SK term (bypassed validations)`,

    // Council Management
    'CREATE_COUNCIL_ROLE': `${userRole} ${userName} created council role '${resourceInfo.name || details.role_name || 'Unknown'}'`,
    'UPDATE_COUNCIL_ROLE': `${userRole} ${userName} updated council role '${resourceInfo.name || details.role_name || 'Unknown'}'`,
    'DELETE_COUNCIL_ROLE': `${userRole} ${userName} deleted council role '${resourceInfo.name || details.role_name || 'Unknown'}'`,
    'CREATE_COUNCIL_MEMBER': `${userRole} ${userName} added '${resourceInfo.name || details.member_name || 'Unknown'}' as '${details.role_name || 'member'}' to council`,
    'UPDATE_COUNCIL_MEMBER': `${userRole} ${userName} updated council member '${resourceInfo.name || details.member_name || 'Unknown'}'`,
    'DELETE_COUNCIL_MEMBER': `${userRole} ${userName} removed '${resourceInfo.name || details.member_name || 'Unknown'}' from council`,
    'UPDATE_COUNCIL_PAGE': `${userRole} ${userName} updated council page settings`,
    'BULK_ACTIVATE': details.resourceType === 'council-member'
      ? `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,
    'Bulk Activate': details.resourceType === 'council-member'
      ? `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} activated ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,
    'BULK_DEACTIVATE': details.resourceType === 'council-member'
      ? `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,
    'Bulk Deactivate': details.resourceType === 'council-member'
      ? `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} deactivated ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,
    'BULK_DELETE': details.resourceType === 'council-member'
      ? `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,
    'Bulk Delete': details.resourceType === 'council-member'
      ? `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} council members`
      : `${userRole} ${userName} deleted ${details.totalItems || details.successCount || details.count || 'multiple'} resources`,

    // Authentication
    'LOGIN': `${userRole} ${userName} logged in`,
    'LOGOUT': `${userRole} ${userName} logged out`,
    'PASSWORD_CHANGE': `${userRole} ${userName} changed password`,
    'PASSWORD_RESET': `${userRole} ${userName} reset password`,

    // Survey Batch Status Actions
    'Pause': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} paused survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'${details.reason ? ` - ${details.reason}` : ''}`
      : `${userRole} ${userName} paused ${details.resourceType || 'resource'}`,
    'Resume': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} resumed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : `${userRole} ${userName} resumed ${details.resourceType || 'resource'}`,
    'Extend': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} extended survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' (end date: ${details.newEndDate ? new Date(details.newEndDate).toLocaleDateString() : 'updated'})`
      : details.resourceType === 'sk-terms'
      ? `${userRole} ${userName} extended SK term '${details.termName || resourceInfo.name || 'Unknown'}' (end date: ${details.newEndDate || 'updated'})`
      : `${userRole} ${userName} extended ${details.resourceType || 'resource'}`,
    'Close': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} closed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : `${userRole} ${userName} closed ${details.resourceType || 'resource'}`,
    'Force Activate': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} force activated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' (start date adjusted to today)`
      : details.resourceType === 'sk-terms'
      ? `${userRole} ${userName} force activated SK term '${details.termName || resourceInfo.name || 'Unknown'}' (start date adjusted to today)`
      : `${userRole} ${userName} force activated ${details.resourceType || 'resource'}`,
    'Force Close': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} force closed survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' (end date adjusted to today)`
      : `${userRole} ${userName} force closed ${details.resourceType || 'resource'}`,
    'Update Status': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} changed status of survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}' to '${details.newStatus || details.status || 'Unknown'}'`
      : `${userRole} ${userName} updated status of ${details.resourceType || 'resource'}`,
    'Bulk Update Status': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} updated status of ${details.totalItems || details.count || 'multiple'} survey batches to '${details.newStatus || details.status || 'Unknown'}'`
      : `${userRole} ${userName} updated status of ${details.totalItems || details.count || 'multiple'} ${details.resourceType || 'items'}`,

    // Export (support both old uppercase and new title case)
    'EXPORT': details.count 
      ? `${userRole} ${userName} exported ${details.count} ${details.resourceType === 'youth' ? 'youth' : details.resourceType === 'sk-officials' ? 'SK officials' : details.resourceType === 'sk-terms' ? 'SK terms' : details.resourceType === 'staff' ? 'staff members' : details.resourceType === 'survey-batch' ? 'survey batches' : details.reportType === 'youth' ? 'youth' : details.reportType === 'sk_official' ? 'SK officials' : details.reportType === 'sk_terms' ? 'SK terms' : details.reportType === 'staff' ? 'staff members' : details.reportType === 'survey-batches' ? 'survey batches' : 'items'} in ${details.format ? (details.format.charAt(0).toUpperCase() + details.format.slice(1).toLowerCase()) : ''} format`
      : `${userRole} ${userName} exported ${details.resourceType || details.reportType || 'data'}`,
    'Export': details.count 
      ? `${userRole} ${userName} exported ${details.count} ${details.resourceType === 'youth' ? 'youth' : details.resourceType === 'sk-officials' ? 'SK officials' : details.resourceType === 'sk-terms' ? 'SK terms' : details.resourceType === 'staff' ? 'staff members' : details.resourceType === 'survey-batch' ? 'survey batches' : details.resourceType === 'validation-queue' ? 'validation queue items' : details.reportType === 'youth' ? 'youth' : details.reportType === 'sk_official' ? 'SK officials' : details.reportType === 'sk_terms' ? 'SK terms' : details.reportType === 'staff' ? 'staff members' : details.reportType === 'survey-batches' ? 'survey batches' : details.reportType === 'validation-queue' ? 'validation queue items' : 'items'} in ${details.format ? (details.format.charAt(0).toUpperCase() + details.format.slice(1).toLowerCase()) : ''} format`
      : `${userRole} ${userName} exported ${details.resourceType || details.reportType || 'data'}`,
    // Bulk Export (new action for bulk export operations)
    'BULK_EXPORT': details.count 
      ? `${userRole} ${userName} bulk exported ${details.count} ${details.resourceType === 'youth' ? 'youth' : details.resourceType === 'sk-officials' ? 'SK officials' : details.resourceType === 'sk-terms' ? 'SK terms' : details.resourceType === 'staff' ? 'staff members' : details.reportType === 'youth' ? 'youth' : details.reportType === 'sk_official' ? 'SK officials' : details.reportType === 'sk_terms' ? 'SK terms' : details.reportType === 'staff' ? 'staff members' : 'items'} in ${details.format ? (details.format.charAt(0).toUpperCase() + details.format.slice(1).toLowerCase()) : ''} format`
      : `${userRole} ${userName} bulk exported ${details.resourceType || details.reportType || 'data'}`,
    'Bulk Export': details.count 
      ? `${userRole} ${userName} bulk exported ${details.count} ${details.resourceType === 'youth' ? 'youth' : details.resourceType === 'sk-officials' ? 'SK officials' : details.resourceType === 'sk-terms' ? 'SK terms' : details.resourceType === 'staff' ? 'staff members' : details.resourceType === 'survey-batch' ? 'survey batches' : details.resourceType === 'validation-queue' ? 'validation queue items' : details.reportType === 'youth' ? 'youth' : details.reportType === 'sk_official' ? 'SK officials' : details.reportType === 'sk_terms' ? 'SK terms' : details.reportType === 'staff' ? 'staff members' : details.reportType === 'survey-batches' ? 'survey batches' : details.reportType === 'validation-queue' ? 'validation queue items' : 'items'} in ${details.format ? (details.format.charAt(0).toUpperCase() + details.format.slice(1).toLowerCase()) : ''} format`
      : `${userRole} ${userName} bulk exported ${details.resourceType || details.reportType || 'data'}`,

    // Announcements
    'CREATE_ANNOUNCEMENT': `${userRole} ${userName} created announcement '${resourceInfo.name || details.title || 'Unknown'}'`,
    'UPDATE_ANNOUNCEMENT': `${userRole} ${userName} updated announcement '${resourceInfo.name || details.title || 'Unknown'}'`,
    'DELETE_ANNOUNCEMENT': `${userRole} ${userName} deleted announcement '${resourceInfo.name || details.title || 'Unknown'}'`,
  };

  // Check for template match
  if (templates[action]) {
    return templates[action];
  }

  // Fallback: Generate generic message
  const actionVerb = action.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return `${userRole} ${userName} ${actionVerb} ${resourceInfo.name || resourceInfo.resourceType || 'resource'}`;
};

/**
 * Quick message generator (synchronous) - uses provided names without DB lookup
 * Use this when you already have user/resource names available
 */
export const generateActivityMessageSync = (action, userInfo, resourceInfo = {}, details = {}) => {
  const userName = userInfo?.userName || userInfo?.user_name || details?.userName || details?.user_name || 'System';
  const userRole = formatUserRole(userInfo?.userType || userInfo?.user_type || 'anonymous');

  const templates = {
    'CREATE_SURVEY_BATCH': `${userRole} ${userName} created survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'UPDATE_SURVEY_BATCH': `${userRole} ${userName} updated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'DELETE_SURVEY_BATCH': `${userRole} ${userName} deleted survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`,
    'VALIDATE_SURVEY_RESPONSE': `${userRole} ${userName} validated survey response ${resourceInfo.youthName || details.youthName ? `for Youth ${resourceInfo.youthName || details.youthName}` : ''}`,
    'REJECT_SURVEY_RESPONSE': `${userRole} ${userName} rejected survey response ${resourceInfo.youthName || details.youthName ? `for Youth ${resourceInfo.youthName || details.youthName}` : ''}`,
    'CREATE': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} created survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : resourceInfo.name ? `${userRole} ${userName} created ${resourceInfo.resourceType || 'resource'} '${resourceInfo.name}'` : `${userRole} ${userName} created ${resourceInfo.resourceType || 'resource'}`,
    'UPDATE': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} updated survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : resourceInfo.name ? `${userRole} ${userName} updated ${resourceInfo.resourceType || 'resource'} '${resourceInfo.name}'` : `${userRole} ${userName} updated ${resourceInfo.resourceType || 'resource'}`,
    'DELETE': details.resourceType === 'survey-batch'
      ? `${userRole} ${userName} deleted survey batch '${resourceInfo.name || resourceInfo.batchName || details.batchName || 'Unknown'}'`
      : resourceInfo.name ? `${userRole} ${userName} deleted ${resourceInfo.resourceType || 'resource'} '${resourceInfo.name}'` : `${userRole} ${userName} deleted ${resourceInfo.resourceType || 'resource'}`,
    'ARCHIVE_YOUTH': `${userRole} ${userName} archived youth profile for '${resourceInfo.name || details.youthName || 'Unknown'}'`,
    'UNARCHIVE_YOUTH': `${userRole} ${userName} unarchived youth profile for '${resourceInfo.name || details.youthName || 'Unknown'}'`,
    'LOGIN': `${userRole} ${userName} logged in`,
    'LOGOUT': `${userRole} ${userName} logged out`,
  };

  if (templates[action]) {
    return templates[action];
  }

  const actionVerb = action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `${userRole} ${userName} ${actionVerb} ${resourceInfo.name || resourceInfo.resourceType || 'resource'}`;
};

