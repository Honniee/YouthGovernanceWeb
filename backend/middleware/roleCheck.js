/**
 * Role-based Authorization Middleware
 * Checks if user has required role or permission
 */

/**
 * Check if user has required role
 * @param {string|string[]} requiredRoles - Single role or array of roles
 */
export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions. Required role(s): ' + allowedRoles.join(', ') 
      });
    }

    next();
  };
};

/**
 * Check if user has required permission
 * @param {string} requiredPermission - Permission to check
 */
export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }

    if (!req.user.permissions) {
      return res.status(403).json({ 
        message: 'No permissions assigned to user.' 
      });
    }

    let permissions;
    try {
      permissions = typeof req.user.permissions === 'string' 
        ? JSON.parse(req.user.permissions) 
        : req.user.permissions;
    } catch (error) {
      return res.status(500).json({ 
        message: 'Invalid permissions format.' 
      });
    }

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        message: `Permission denied. Required: ${requiredPermission}` 
      });
    }

    next();
  };
};

/**
 * Check if user belongs to specific user type
 * @param {string|string[]} requiredUserTypes - User type(s) to check
 */
export const requireUserType = (requiredUserTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }

    const userType = req.user.userType;
    const allowedTypes = Array.isArray(requiredUserTypes) ? requiredUserTypes : [requiredUserTypes];

    if (!allowedTypes.includes(userType)) {
      return res.status(403).json({ 
        message: 'Access denied. Required user type(s): ' + allowedTypes.join(', ') 
      });
    }

    next();
  };
};

/**
 * Admin only access
 */
export const requireAdmin = requireRole('admin');

/**
 * LYDO staff access (admin or lydo_staff)
 */
export const requireLYDOStaff = requireRole(['admin', 'lydo_staff']);

/**
 * SK Officials only access
 */
export const requireSKOfficial = requireUserType('sk_official');

/**
 * Check if user can access their own data or is admin
 * @param {string} userIdParam - Parameter name containing user ID
 */
export const requireOwnershipOrAdmin = (userIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }

    const targetUserId = req.params[userIdParam];
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && targetUserId !== currentUserId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access your own data.' 
      });
    }

    next();
  };
};

/**
 * Check if SK official can access data from their barangay
 */
export const requireSameBarangayOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required.' 
    });
  }

  const isAdmin = req.user.role === 'admin';
  const isLYDOStaff = req.user.userType === 'lydo_staff';
  
  if (isAdmin || isLYDOStaff) {
    // Admin and LYDO staff can access all barangays
    return next();
  }

  if (req.user.userType === 'sk_official') {
    // SK officials can only access their own barangay
    const targetBarangay = req.params.barangay || req.body.barangay;
    
    if (targetBarangay && targetBarangay !== req.user.barangay) {
      return res.status(403).json({ 
        message: 'Access denied. You can only access data from your own barangay.' 
      });
    }
  }

  next();
};

/**
 * Rate limiting for different user types
 */
export const roleBasedRateLimit = (limits) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(); // Let rate limiter handle unauthenticated requests
    }

    const userRole = req.user.role;
    const userLimit = limits[userRole] || limits.default;

    if (userLimit) {
      // Apply role-specific rate limiting
      req.rateLimit = userLimit;
    }

    next();
  };
}; 