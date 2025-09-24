import { logSecurity, logAuth } from '../utils/logger.js';
import { query } from '../config/database.js';

/**
 * Security Monitoring Middleware
 * Detects and responds to security threats in real-time
 */

class SecurityMonitor {
  constructor() {
    this.suspiciousIPs = new Map(); // IP -> { attempts, lastAttempt, blocked }
    this.rateLimitViolations = new Map(); // IP -> count
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
    
    // Log security event
    logSecurity('Failed Login Attempt', {
      ip,
      email,
      attempts: attempts.count,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Check if threshold exceeded
    if (attempts.count >= this.maxFailedAttempts) {
      this.blockIP(ip, 'Multiple failed login attempts');
      
      // Store in database for persistent tracking
      this.logSecurityIncident({
        type: 'BRUTE_FORCE_ATTEMPT',
        ip,
        email,
        attempts: attempts.count,
        userAgent: req.headers['user-agent'],
        severity: 'HIGH'
      });
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
    
    // Log successful authentication
    logAuth('Successful Login', user.id, user.user_type, {
      ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // Check for suspicious login patterns
    this.checkSuspiciousLogin(req, user, ip);
  }

  /**
   * Check for suspicious login patterns
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

      const uniqueIPs = new Set(recentLogins.rows.map(row => row.login_ip));
      
      if (uniqueIPs.size > 3) {
        logSecurity('Multiple IP Login Pattern', {
          userId: user.id,
          email: user.email,
          uniqueIPs: Array.from(uniqueIPs),
          currentIP: ip,
          severity: 'MEDIUM'
        });

        this.logSecurityIncident({
          type: 'MULTIPLE_IP_LOGIN',
          userId: user.id,
          email: user.email,
          ip,
          uniqueIPs: Array.from(uniqueIPs),
          severity: 'MEDIUM'
        });
      }

      // Check for unusual time patterns
      const now = new Date();
      const hour = now.getHours();
      
      // Flag logins between 2 AM and 6 AM as potentially suspicious
      if (hour >= 2 && hour <= 6) {
        logSecurity('Off-Hours Login', {
          userId: user.id,
          email: user.email,
          ip,
          hour,
          severity: 'LOW'
        });
      }

    } catch (error) {
      console.error('Error checking suspicious login:', error);
    }
  }

  /**
   * Monitor rate limit violations
   */
  monitorRateLimitViolation(req) {
    const ip = this.getClientIP(req);
    
    if (!this.rateLimitViolations.has(ip)) {
      this.rateLimitViolations.set(ip, 1);
    } else {
      this.rateLimitViolations.set(ip, this.rateLimitViolations.get(ip) + 1);
    }

    const violations = this.rateLimitViolations.get(ip);
    
    logSecurity('Rate Limit Violation', {
      ip,
      violations,
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });

    // Block IP after multiple violations
    if (violations >= 10) {
      this.blockIP(ip, 'Excessive rate limit violations');
    }
  }

  /**
   * Monitor suspicious API access patterns
   */
  monitorAPIAccess(req) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /php/i
    ];

    const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspiciousUA) {
      logSecurity('Suspicious User Agent', {
        ip,
        userAgent,
        endpoint: req.path,
        method: req.method
      });
    }

    // Check for automated requests (no common browser headers)
    const hasAcceptHeader = req.headers.accept;
    const hasAcceptLanguage = req.headers['accept-language'];
    const hasAcceptEncoding = req.headers['accept-encoding'];
    
    if (!hasAcceptHeader || !hasAcceptLanguage || !hasAcceptEncoding) {
      logSecurity('Automated Request Pattern', {
        ip,
        userAgent,
        endpoint: req.path,
        missingHeaders: {
          accept: !hasAcceptHeader,
          acceptLanguage: !hasAcceptLanguage,
          acceptEncoding: !hasAcceptEncoding
        }
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

    logSecurity('IP Blocked', {
      ip,
      reason,
      blockedAt: new Date(now).toISOString()
    });
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
   * Log security incident to database
   */
  async logSecurityIncident(incident) {
    try {
      await query(`
        INSERT INTO "Security_Incidents" (
          incident_id, type, severity, ip_address, user_id, email, 
          details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        `SEC${Date.now()}`,
        incident.type,
        incident.severity,
        incident.ip,
        incident.userId || null,
        incident.email || null,
        JSON.stringify(incident)
      ]);
    } catch (error) {
      console.error('Error logging security incident:', error);
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats() {
    try {
      const stats = await query(`
        SELECT 
          type,
          severity,
          COUNT(*) as count,
          MAX(created_at) as latest_incident
        FROM "Security_Incidents"
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY type, severity
        ORDER BY count DESC
      `);

      return {
        blockedIPs: this.suspiciousIPs.size,
        activeBlocks: Array.from(this.suspiciousIPs.values()).filter(data => data.blocked).length,
        failedLoginAttempts: this.failedLogins.size,
        rateLimitViolations: Array.from(this.rateLimitViolations.values()).reduce((a, b) => a + b, 0),
        incidents: stats.rows
      };
    } catch (error) {
      console.error('Error getting security stats:', error);
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

    // Clean up rate limit violations
    this.rateLimitViolations.clear();

    // Clean up expired IP blocks
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.blocked && now - data.blockedAt > this.blockDuration) {
        this.suspiciousIPs.delete(ip);
      }
    }

    console.log('Security monitor cleanup completed');
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

/**
 * Middleware to block suspicious IPs
 */
export const blockSuspiciousIPs = (req, res, next) => {
  const ip = securityMonitor.getClientIP(req);
  
  if (securityMonitor.isBlocked(ip)) {
    logSecurity('Blocked IP Attempt', {
      ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });

    return res.status(429).json({
      error: 'Access temporarily blocked',
      message: 'Your IP has been temporarily blocked due to suspicious activity',
      retryAfter: Math.ceil(securityMonitor.blockDuration / 1000)
    });
  }
  
  next();
};

/**
 * Middleware to monitor API access
 */
export const monitorAPIAccess = (req, res, next) => {
  securityMonitor.monitorAPIAccess(req);
  next();
};

export default securityMonitor; 