/**
 * Timezone Utilities
 * Functions to format timestamps in Asia/Manila timezone (UTC+8)
 */

/**
 * Format timestamp to Asia/Manila timezone
 * @param {string|Date} timestamp - Timestamp string or Date object
 * @param {object} options - Formatting options
 * @returns {string} Formatted timestamp string
 */
export const formatAsiaManilaTime = (timestamp, options = {}) => {
  if (!timestamp) return '—';
  
  try {
    let date;
    let isManilaTime = false;
    
    // If timestamp is an ISO string with +08:00 timezone (from backend)
    if (typeof timestamp === 'string' && timestamp.includes('+08:00')) {
      // Parse the ISO string - JavaScript converts it to UTC internally
      // "2025-11-07T14:24:56+08:00" means 2:24 PM in Manila
      // JavaScript stores this as UTC: "2025-11-07T06:24:56Z" (6:24 AM UTC)
      date = new Date(timestamp);
      isManilaTime = true;
    } else if (typeof timestamp === 'string' && !timestamp.includes('T') && !timestamp.includes('Z') && !timestamp.includes('+')) {
      // PostgreSQL format "YYYY-MM-DD HH:MM:SS" - this is already in Manila timezone
      const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
      if (match) {
        const [, year, month, day, hour, minute, second, millisecond] = match;
        // The timestamp is already in Manila time, so we need to create a Date object
        // that represents this time. We'll create it as UTC by subtracting 8 hours,
        // then format it with Manila timezone to get back the original time
        const utcTime = Date.UTC(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour) - 8, // Subtract 8 hours: Manila time to UTC
          parseInt(minute),
          parseInt(second),
          millisecond ? parseInt(millisecond.substring(1).padEnd(3, '0')) : 0
        );
        date = new Date(utcTime);
        isManilaTime = true;
      } else {
        date = new Date(timestamp);
      }
    } else {
      // For other formats or Date objects
      date = new Date(timestamp);
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    // Format with Asia/Manila timezone
    // Use Intl.DateTimeFormat for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...options
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid date';
  }
};

/**
 * Format timestamp to Asia/Manila date only
 * @param {string|Date} timestamp - Timestamp string or Date object
 * @returns {string} Formatted date string
 */
export const formatAsiaManilaDate = (timestamp) => {
  if (!timestamp) return '—';
  
  try {
    const date = new Date(timestamp);
    
    if (typeof timestamp === 'string' && !timestamp.includes('T') && !timestamp.includes('Z') && !timestamp.includes('+')) {
      const dateWithTZ = new Date(timestamp + '+08:00');
      return dateWithTZ.toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'Invalid date';
  }
};

/**
 * Get relative time (e.g., "2 hours ago") in Asia/Manila timezone
 * @param {string|Date} timestamp - Timestamp string or Date object
 * @returns {string} Relative time string
 */
export const getRelativeTimeAsiaManila = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  
  try {
    let date;
    if (typeof timestamp === 'string' && !timestamp.includes('T') && !timestamp.includes('Z') && !timestamp.includes('+')) {
      date = new Date(timestamp + '+08:00');
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return formatAsiaManilaDate(timestamp);
    }
  } catch (error) {
    console.error('Error calculating relative time:', error, timestamp);
    return 'Unknown time';
  }
};

