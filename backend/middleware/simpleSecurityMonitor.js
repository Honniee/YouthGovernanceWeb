import { logSecurity, logAuth } from '../utils/logger.js';
import logger from '../utils/logger.js';
import { query } from '../config/database.js';

/**
 * Simplified Security Monitoring System
 * Uses existing Activity_Logs table - no new tables required
 */

class SimpleSecurityMonitor {
  constructor() {
    this.suspiciousIPs = new Map(); // IP -> { attempts, lastAttempt, blocked }
    this.failedLogins = new Map(); // IP -> { count, lastAttempt }
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
    this.maxFailedAttempts = 5;
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Monitor failed login attempts
   */
  monitorFailedLogin(req, email, ip) {
    const key = `${ip}:${email}`;
    const now = Date.now();
    
    if (!this.failedLogins.has(key)) {
      this.failedLogins.set(key, { count: 1, lastAttempt: now, email });
    } else {
      const data = this.failedLogins.get(key);
      data.count++;
      data.lastAttempt = now;
    }

    const attempts = this.failedLogins.get(key);
    
    // Log to existing Activity_Logs table
    this.logSecurityEvent('failed_login', null, 'authentication', {
      ip,
      email,
      attempts: attempts.count,
      userAgent: req.headers['user-agent'],
      severity: attempts.count >= this.maxFailedAttempts ? 'HIGH' : 'MEDIUM'
    });

    // Check if threshold exceeded
    if (attempts.count >= this.maxFailedAttempts) {
      this.blockIP(ip, 'Multiple failed login attempts');
    }

    return attempts.count;
  }

  /**
   * Monitor successful login
   */
  monitorSuccessfulLogin(req, user, ip) {
    // Clear failed attempts for this IP/email combination
    const key = `${ip}:${user.email}`;
    this.failedLogins.delete(key);
    
    // Log successful authentication to Activity_Logs
    this.logSecurityEvent('successful_login', user.id, 'authentication', {
      ip,
      userAgent: req.headers['user-agent'],
      userType: user.user_type
    });

    // Check for suspicious login patterns
    this.checkSuspiciousLogin(req, user, ip);
  }

  /**
   * Check for suspicious login patterns using existing Activity_Logs
   */
  async checkSuspiciousLogin(req, user, ip) {
    try {
      // Check for multiple IPs for same user in short time
      const recentLogins = await query(`
        SELECT DISTINCT details->>'ip' as login_ip, created_at
        FROM "Activity_Logs"
        WHERE user_id = $1 AND action = 'login' 
        AND created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
        LIMIT 10
      `, [user.id]);

      if (recentLogins.rows.length > 0) {
        const uniqueIPs = new Set(recentLogins.rows.map(row => row.login_ip).filter(Boolean));
        
        if (uniqueIPs.size > 3) {
          this.logSecurityEvent('multiple_ip_login', user.id, 'authentication', {
            userId: user.id,
            email: user.email,
            uniqueIPs: Array.from(uniqueIPs),
            currentIP: ip,
            severity: 'MEDIUM'
          });
        }
      }

      // Check for unusual time patterns
      const now = new Date();
      const hour = now.getHours();
      
      // Flag logins between 2 AM and 6 AM as potentially suspicious
      if (hour >= 2 && hour <= 6) {
        this.logSecurityEvent('off_hours_login', user.id, 'authentication', {
          userId: user.id,
          email: user.email,
          ip,
          hour,
          severity: 'LOW'
        });
      }

    } catch (error) {
      logger.error('Error checking suspicious login', { error: error.message, stack: error.stack, userId: user?.id });
    }
  }

  /**
   * Monitor API access patterns
   */
  monitorAPIAccess(req) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /php/i
    ];

    const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspiciousUA) {
      this.logSecurityEvent('suspicious_user_agent', null, 'api_access', {
        ip,
        userAgent,
        endpoint: req.path,
        method: req.method,
        severity: 'LOW'
      });
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip, reason) {
    const now = Date.now();
    
    this.suspiciousIPs.set(ip, {
      blocked: true,
      blockedAt: now,
      reason,
      attempts: this.suspiciousIPs.get(ip)?.attempts || 0
    });

    // Log IP block to Activity_Logs
    this.logSecurityEvent('ip_blocked', null, 'security', {
      ip,
      reason,
      blockedAt: new Date(now).toISOString(),
      severity: 'HIGH'
    });

    logSecurity('IP Blocked', { ip, reason });
  }

  /**
   * Check if IP is blocked
   */
  isBlocked(ip) {
    const data = this.suspiciousIPs.get(ip);
    if (!data || !data.blocked) return false;
    
    // Check if block has expired
    if (Date.now() - data.blockedAt > this.blockDuration) {
      this.suspiciousIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Log security event to existing Activity_Logs table
   */
  async logSecurityEvent(action, userId, category, details) {
    try {
      await query(`
        INSERT INTO "Activity_Logs" (
          log_id, user_id, user_type, action, resource_type, category, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        `SEC${Date.now()}`,
        userId,
        'security_system',
        action,
        'security_event',
        category,
        JSON.stringify(details)
      ]);
    } catch (error) {
      logger.error('Error logging security event', { error: error.message, stack: error.stack, action, category });
    }
  }

  /**
   * Get security statistics from Activity_Logs
   */
  async getSecurityStats() {
    try {
      const stats = await query(`
        SELECT 
          action,
          COUNT(*) as count,
          MAX(created_at) as latest_event
        FROM "Activity_Logs"
        WHERE user_type = 'security_system'
        AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC
      `);

      return {
        blockedIPs: this.suspiciousIPs.size,
        activeBlocks: Array.from(this.suspiciousIPs.values()).filter(data => data.blocked).length,
        failedLoginAttempts: this.failedLogins.size,
        securityEvents: stats.rows
      };
    } catch (error) {
      logger.error('Error getting security stats', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Cleanup expired data
   */
  cleanup() {
    const now = Date.now();
    const expiredTime = 60 * 60 * 1000; // 1 hour
    
    // Clean up failed login attempts
    for (const [key, data] of this.failedLogins.entries()) {
      if (now - data.lastAttempt > expiredTime) {
        this.failedLogins.delete(key);
      }
    }

    // Clean up expired IP blocks
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.blocked && now - data.blockedAt > this.blockDuration) {
        this.suspiciousIPs.delete(ip);
      }
    }

    logger.debug('Security monitor cleanup completed', { 
      blockedIPs: this.suspiciousIPs.size,
      failedLogins: this.failedLogins.size 
    });
  }
}

// Create singleton instance
const simpleSecurityMonitor = new SimpleSecurityMonitor();

/**
 * Middleware to block suspicious IPs
 */
export const blockSuspiciousIPs = (req, res, next) => {
  const ip = simpleSecurityMonitor.getClientIP(req);
  
  if (simpleSecurityMonitor.isBlocked(ip)) {
    logSecurity('Blocked IP Attempt', {
      ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });

    return res.status(429).json({
      error: 'Access temporarily blocked',
      message: 'Your IP has been temporarily blocked due to suspicious activity',
      retryAfter: Math.ceil(simpleSecurityMonitor.blockDuration / 1000)
    });
  }
  
  next();
};

/**
 * Middleware to monitor API access
 */
export const monitorAPIAccess = (req, res, next) => {
  simpleSecurityMonitor.monitorAPIAccess(req);
  next();
};

export default simpleSecurityMonitor; 