import { query } from '../config/database.js';

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
    
    console.log(`🆔 Generated new LYDO ID: ${newId} (counter: ${lydoIdCounter})`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating LYDO ID:', error);
    throw new Error('Failed to generate LYDO ID');
  }
};



/**
 * Generates a unique notification ID for notifications
 * Format: NOT001, NOT002, NOT003, etc.
 * @returns {Promise<string>} The generated notification ID
 */
// Cache to prevent race conditions
let notificationIdCounter = null;
let lastNotificationIdUpdate = 0;
let generationLock = Promise.resolve(); // Mutex to prevent race conditions

export const generateNotificationId = async () => {
  // Use a mutex to ensure atomic ID generation
  return generationLock = generationLock.then(async () => {
    try {
      const now = Date.now();
      
      // Refresh counter every 5 seconds or if not initialized
      if (!notificationIdCounter || (now - lastNotificationIdUpdate) > 5000) {
        const result = await query(
          'SELECT notification_id FROM "Notifications" ORDER BY notification_id DESC LIMIT 1'
        );
        
        if (result.rows.length > 0) {
          const lastId = result.rows[0].notification_id;
          const match = lastId.match(/NOT(\d+)/);
          if (match && match[1]) {
            const lastNumber = parseInt(match[1]);
            if (!isNaN(lastNumber)) {
              notificationIdCounter = lastNumber;
            } else {
              notificationIdCounter = 0;
            }
          } else {
            notificationIdCounter = 0;
          }
        } else {
          notificationIdCounter = 0;
        }
        
        lastNotificationIdUpdate = now;
      }
      
      // Increment counter atomically
      notificationIdCounter++;
      
      const formattedNumber = String(notificationIdCounter).padStart(3, '0');
      const newId = `NOT${formattedNumber}`;
      
      console.log(`🆔 Generated notification ID: ${newId} (counter: ${notificationIdCounter})`);
      return newId;
      
    } catch (error) {
      console.error('❌ Error generating notification ID:', error);
      throw new Error('Failed to generate notification ID');
    }
  });
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
    console.error('❌ Error generating role ID:', error);
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
    
    console.log(`🆔 Generated new SK ID: ${newId} (counter: ${skIdCounter})`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating SK ID:', error);
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
    
    console.log(`🆔 Generated new Term ID: ${newId}`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating term ID:', error);
    throw new Error('Failed to generate term ID');
  }
};

/**
 * Generates a unique user ID for Users table
 * Format: USR001, USR002, USR003, etc.
 * @returns {Promise<string>} The generated user ID
 */
let userIdGenerationLock = Promise.resolve(); // Mutex to prevent race conditions

export const generateUserId = async () => {
  return userIdGenerationLock = userIdGenerationLock.then(async () => {
    try {
      const result = await query(
        'SELECT user_id FROM "Users" ORDER BY user_id DESC LIMIT 1'
      );
      
      let nextNumber = 1;
      
      if (result.rows.length > 0) {
        const lastId = result.rows[0].user_id;
        const match = lastId.match(/USR(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      const formattedNumber = String(nextNumber).padStart(3, '0');
      const newId = `USR${formattedNumber}`;
      
      console.log(`🆔 Generated new User ID: ${newId}`);
      return newId;
      
    } catch (error) {
      console.error('❌ Error generating user ID:', error);
      throw new Error('Failed to generate user ID');
    }
  });
};

/**
 * Generates a unique Activity Log ID
 * Format: ACT001, ACT002, ACT003, etc.
 * @returns {Promise<string>} The generated Activity Log ID
 */
export const generateLogId = async (client = null) => {
  try {
    const db = client || { query };
    
    // Get the latest log ID from the database
    const result = await db.query(
      'SELECT log_id FROM "Activity_Logs" WHERE log_id LIKE \'ACT%\' ORDER BY log_id DESC LIMIT 1'
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      // Extract the number from the last ID (e.g., "ACT001" -> 1)
      const lastId = result.rows[0].log_id;
      const match = lastId.match(/ACT(\d+)/);
      if (match && match[1]) {
        const lastNumber = parseInt(match[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }
    
    const formattedNumber = String(nextNumber).padStart(3, '0');
    const newId = `ACT${formattedNumber}`;
    
    console.log(`🆔 Generated new Activity Log ID: ${newId}`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating Activity Log ID:', error);
    throw new Error('Failed to generate Activity Log ID');
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
    
    console.log(`🆔 Generated new Voter ID: ${newId} (counter: ${voterIdCounter})`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating Voter ID:', error);
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
    
    console.log(`🆔 Generated new Announcement ID: ${newId} (counter: ${announcementIdCounter})`);
    return newId;
    
  } catch (error) {
    console.error('❌ Error generating Announcement ID:', error);
    throw new Error('Failed to generate Announcement ID');
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
    case 'USR':
      return generateUserId();
    case 'ACT':
      return generateLogId();
    case 'VOT':
      return generateVoterId();
    case 'NOT':
      return generateNotificationId();
    default:
      throw new Error(`Unknown ID prefix: ${prefix}`);
  }
};

