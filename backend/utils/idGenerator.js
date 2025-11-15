import { query } from '../config/database.js';
import logger from './logger.js';

/**
 * Generates a unique LYDO ID for new staff members
 * Format: LYDO001, LYDO002, LYDO003, etc.
 * @returns {Promise<string>} The generated LYDO ID
 */
// In-memory counter for atomic ID generation (similar to notification ID)
let lydoIdCounter = null;
let lastLydoIdUpdate = 0;

export const generateLYDOId = async () => {
  try {
    const now = Date.now();
    
    // Refresh counter from database every 5 seconds or on first call
    if (!lydoIdCounter || (now - lastLydoIdUpdate) > 5000) {
      const result = await query(
        'SELECT lydo_id FROM "LYDO" WHERE lydo_id LIKE \'LYDO%\' ORDER BY lydo_id DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        // Extract the number from the last ID (e.g., "LYDO001" -> 1)
        const lastId = result.rows[0].lydo_id;
        const match = lastId.match(/LYDO(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            lydoIdCounter = lastNumber;
          } else {
            lydoIdCounter = 0;
          }
        } else {
          lydoIdCounter = 0;
        }
      } else {
        lydoIdCounter = 0;
      }
      
      lastLydoIdUpdate = now;
    }
    
    // Increment counter atomically
    lydoIdCounter++;
    
    // Format the ID with leading zeros (e.g., 1 -> "001")
    const formattedNumber = String(lydoIdCounter).padStart(3, '0');
    const newId = `LYDO${formattedNumber}`;
    
    logger.debug(`Generated new LYDO ID: ${newId}`, { newId, counter: lydoIdCounter });
    return newId;
    
  } catch (error) {
    logger.error('Error generating LYDO ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate LYDO ID');
  }
};



/**
 * Generates a unique notification ID for notifications
 * Format: NOT{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated notification ID
 */
export const generateNotificationId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `NOT${timestamp}`;
    
    logger.debug(`Generated notification ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating notification ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate notification ID');
  }
};

/**
 * Generates a unique role ID for new roles
 * Format: ROL001, ROL002, ROL003, etc.
 * @returns {Promise<string>} The generated role ID
 */
export const generateRoleId = async () => {
  try {
    const result = await query(
      'SELECT role_id FROM "Roles" ORDER BY role_id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastId = result.rows[0].role_id;
      const match = lastId.match(/ROL(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    const newId = `ROL${formattedNumber}`;
    
    return newId;
    
  } catch (error) {
    logger.error('Error generating role ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate role ID');
  }
};

/**
 * Generates a unique SK ID for new SK officials
 * Format: SK001, SK002, SK003, etc.
 * @returns {Promise<string>} The generated SK ID
 */
// In-memory counter for atomic SK ID generation
let skIdCounter = null;
let lastSkIdUpdate = 0;

export const generateSKId = async () => {
  try {
    const now = Date.now();
    
    // Refresh counter from database every 5 seconds or on first call
    if (!skIdCounter || (now - lastSkIdUpdate) > 5000) {
      const result = await query(
        'SELECT sk_id FROM "SK_Officials" WHERE sk_id LIKE \'SK%\' ORDER BY sk_id DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        // Extract the number from the last ID (e.g., "SK001" -> 1)
        const lastId = result.rows[0].sk_id;
        const match = lastId.match(/SK(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            skIdCounter = lastNumber;
          } else {
            skIdCounter = 0;
          }
        } else {
          skIdCounter = 0;
        }
      } else {
        skIdCounter = 0;
      }
      
      lastSkIdUpdate = now;
    }
    
    // Increment counter atomically
    skIdCounter++;
    
    // Format the ID with leading zeros (e.g., 1 -> "001")
    const formattedNumber = String(skIdCounter).padStart(3, '0');
    const newId = `SK${formattedNumber}`;
    
    logger.debug(`Generated new SK ID: ${newId}`, { newId, counter: skIdCounter });
    return newId;
    
  } catch (error) {
    logger.error('Error generating SK ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate SK ID');
  }
};

/**
 * Generates a unique term ID for SK terms
 * Format: TRM001, TRM002, TRM003, etc.
 * @returns {Promise<string>} The generated term ID
 */
export const generateTermId = async () => {
  try {
    const result = await query(
      'SELECT term_id FROM "SK_Terms" ORDER BY term_id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastId = result.rows[0].term_id;
      const match = lastId.match(/TRM(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    const newId = `TRM${formattedNumber}`;
    
    logger.debug(`Generated new Term ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating term ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate term ID');
  }
};

/**
 * Generates a unique youth ID for Youth_Profiling table
 * Format: YTH{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated youth ID
 */
export const generateYouthId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `YTH${timestamp}`;
    
    logger.debug(`Generated new Youth ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating youth ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate youth ID');
  }
};

/**
 * Generates a unique user ID for Users table
 * Format: USR{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated user ID
 */
export const generateUserId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `USR${timestamp}`;
    
    logger.debug(`Generated new User ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating user ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate user ID');
  }
};

/**
 * Generates a unique Activity Log ID
 * Format: ACT{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Activity Log ID
 */
export const generateLogId = async (client = null) => {
  try {
    const timestamp = Date.now();
    const newId = `ACT${timestamp}`;
    
    logger.debug(`Generated new Activity Log ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Activity Log ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Activity Log ID');
  }
};

/**
 * Generates a unique Consent Log ID
 * Format: CNS{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Consent Log ID
 */
export const generateConsentLogId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `CNS${timestamp}`;
    
    logger.debug(`Generated new Consent Log ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Consent Log ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Consent Log ID');
  }
};

/**
 * Generates a unique Data Subject Request ID
 * Format: DSR{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Data Subject Request ID
 */
export const generateDataSubjectRequestId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `DSR${timestamp}`;
    
    logger.debug(`Generated new Data Subject Request ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Data Subject Request ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Data Subject Request ID');
  }
};

/**
 * Generates a unique Voter ID for new voters
 * Format: VOT001, VOT002, VOT003, etc.
 * @returns {Promise<string>} The generated Voter ID
 */
// In-memory counter for atomic Voter ID generation
let voterIdCounter = null;
let lastVoterIdUpdate = 0;

export const generateVoterId = async () => {
  try {
    const now = Date.now();
    
    // Refresh counter from database every 5 seconds or on first call
    if (!voterIdCounter || (now - lastVoterIdUpdate) > 5000) {
      const result = await query(
        'SELECT voter_id FROM "Voters_List" WHERE voter_id LIKE \'VOT%\' ORDER BY voter_id DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        // Extract the number from the last ID (e.g., "VOT001" -> 1)
        const lastId = result.rows[0].voter_id;
        const match = lastId.match(/VOT(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            voterIdCounter = lastNumber;
          } else {
            voterIdCounter = 0;
          }
        } else {
          voterIdCounter = 0;
        }
      } else {
        voterIdCounter = 0;
      }
      
      lastVoterIdUpdate = now;
    }
    
    // Increment counter atomically
    voterIdCounter++;
    
    // Format the ID with leading zeros (e.g., 1 -> "001")
    const formattedNumber = String(voterIdCounter).padStart(3, '0');
    const newId = `VOT${formattedNumber}`;
    
    logger.debug(`Generated new Voter ID: ${newId}`, { newId, counter: voterIdCounter });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Voter ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Voter ID');
  }
};

/**
 * Generates a unique Announcement ID for new announcements
 * Format: ANN001, ANN002, ANN003, etc.
 * @returns {Promise<string>} The generated Announcement ID
 */
// In-memory counter for atomic Announcement ID generation
let announcementIdCounter = null;
let lastAnnouncementIdUpdate = 0;

export const generateAnnouncementId = async () => {
  try {
    const now = Date.now();
    
    // Refresh counter from database every 5 seconds or on first call
    if (!announcementIdCounter || (now - lastAnnouncementIdUpdate) > 5000) {
      const result = await query(
        'SELECT announcement_id FROM "Announcements" WHERE announcement_id LIKE \'ANN%\' ORDER BY announcement_id DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        // Extract the number from the last ID (e.g., "ANN001" -> 1)
        const lastId = result.rows[0].announcement_id;
        const match = lastId.match(/ANN(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            announcementIdCounter = lastNumber;
          } else {
            announcementIdCounter = 0;
          }
        } else {
          announcementIdCounter = 0;
        }
      } else {
        announcementIdCounter = 0;
      }
      
      lastAnnouncementIdUpdate = now;
    }
    
    // Increment counter atomically
    announcementIdCounter++;
    
    // Format the ID with leading zeros (e.g., 1 -> "001")
    const formattedNumber = String(announcementIdCounter).padStart(3, '0');
    const newId = `ANN${formattedNumber}`;
    
    logger.debug(`Generated new Announcement ID: ${newId}`, { newId, counter: announcementIdCounter });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Announcement ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Announcement ID');
  }
};

/**
 * Generates a unique Response ID for survey responses
 * Format: RES{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Response ID
 */
export const generateResponseId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `RES${timestamp}`;
    
    logger.debug(`Generated new Response ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating response ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate response ID');
  }
};

/**
 * Generate Queue ID using timestamp
 * Format: QUE{timestamp} - Uses timestamp to avoid race conditions
 */
export const generateQueueId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `QUE${timestamp}`;
    
    logger.debug(`Generated new Queue ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating queue ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate queue ID');
  }
};

/**
 * Generates a unique Council Member ID
 * Format: LYDCMEM001, LYDCMEM002, etc.
 * @returns {Promise<string>} The generated Council Member ID
 */
export const generateCouncilMemberId = async () => {
  try {
    const result = await query(
      'SELECT id FROM "LYDO_Council_Members" WHERE id LIKE \'LYDCMEM%\' ORDER BY id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastId = result.rows[0].id;
      const match = lastId.match(/LYDCMEM(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    const newId = `LYDCMEM${formattedNumber}`;
    
    logger.debug(`Generated new Council Member ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Council Member ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Council Member ID');
  }
};

/**
 * Generates a unique Council Role ID
 * Format: LYDCROL001, LYDCROL002, etc.
 * @returns {Promise<string>} The generated Council Role ID
 */
export const generateCouncilRoleId = async () => {
  try {
    const result = await query(
      'SELECT id FROM "LYDO_Council_Roles" WHERE id LIKE \'LYDCROL%\' ORDER BY id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastId = result.rows[0].id;
      const match = lastId.match(/LYDCROL(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    const newId = `LYDCROL${formattedNumber}`;
    
    logger.debug(`Generated new Council Role ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating Council Role ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate Council Role ID');
  }
};

/**
 * Generates a unique Segment ID for Youth Segments
 * Format: SEG{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Segment ID
 */
export const generateSegmentId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `SEG${timestamp}`;
    
    logger.debug(`Generated new Segment ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating segment ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate segment ID');
  }
};

/**
 * Generates a unique Assignment ID for Youth Cluster Assignments
 * Format: ASG{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Assignment ID
 */
export const generateAssignmentId = async () => {
  try {
    const timestamp = Date.now();
    // Add random suffix to handle multiple assignments in same millisecond
    const random = Math.floor(Math.random() * 1000);
    const newId = `ASG${timestamp}${random}`;
    
    logger.debug(`Generated new Assignment ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating assignment ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate assignment ID');
  }
};

/**
 * Generates a unique Recommendation ID for Program Recommendations
 * Format: REC{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Recommendation ID
 */
export const generateRecommendationId = async () => {
  try {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const newId = `REC${timestamp}${random}`;
    
    logger.debug(`Generated new Recommendation ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating recommendation ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate recommendation ID');
  }
};

/**
 * Generates a unique Clustering Run ID
 * Format: CLR{timestamp} - Uses timestamp to avoid race conditions
 * @returns {Promise<string>} The generated Clustering Run ID
 */
export const generateClusteringRunId = async () => {
  try {
    const timestamp = Date.now();
    const newId = `CLR${timestamp}`;
    
    logger.debug(`Generated new Clustering Run ID: ${newId}`, { newId });
    return newId;
    
  } catch (error) {
    logger.error('Error generating clustering run ID', { error: error.message, stack: error.stack });
    throw new Error('Failed to generate clustering run ID');
  }
};

/**
 * Generic ID generator function that routes to specific generators based on prefix
 * @param {string} prefix - The prefix for the ID (e.g., 'ANN', 'LYDO', 'SK', etc.)
 * @returns {Promise<string>} The generated ID
 */
export const generateId = async (prefix) => {
  switch (prefix.toUpperCase()) {
    case 'ANN':
      return generateAnnouncementId();
    case 'LYDO':
      return generateLYDOId();
    case 'SK':
      return generateSKId();
    case 'ROL':
      return generateRoleId();
    case 'TRM':
      return generateTermId();
    case 'YTH':
      return generateYouthId();
    case 'USR':
      return generateUserId();
    case 'ACT':
      return generateLogId();
    case 'CNS':
      return generateConsentLogId();
    case 'DSR':
      return generateDataSubjectRequestId();
    case 'VOT':
      return generateVoterId();
    case 'NOT':
      return generateNotificationId();
    case 'RES':
      return generateResponseId();
    case 'QUE':
      return generateQueueId();
    case 'LYDCMEM':
      return generateCouncilMemberId();
    case 'LYDCROL':
      return generateCouncilRoleId();
    case 'SEG':
      return generateSegmentId();
    case 'ASG':
      return generateAssignmentId();
    case 'REC':
      return generateRecommendationId();
    case 'CLR':
      return generateClusteringRunId();
    default:
      throw new Error(`Unknown ID prefix: ${prefix}`);
  }
};

