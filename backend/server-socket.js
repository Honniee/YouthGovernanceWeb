import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from './config/database.js';

let ioInstance = null;
const connectedUsers = new Map(); // Track connected users: userId -> socketId[]

/**
 * Enhanced WebSocket Server with JWT Verification and Connection Tracking
 */

export function initSocket(httpServer) {
  if (ioInstance) return ioInstance;

  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || process.env.CORS_ORIGIN)
    : (process.env.FRONTEND_URL || 'http://localhost:5173');

  const io = new Server(httpServer, {
    cors: { 
      origin: allowedOrigin,
      methods: ['GET','POST','PATCH','PUT','DELETE'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // JWT Verification Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token || 
                   socket.handshake?.headers?.authorization?.replace('Bearer ', '') || 
                   '';

      if (!token) {
        // Allow connection without token (for public features)
        // But tag it as unauthenticated
        socket.data = { authenticated: false };
        return next();
      }

      // Verify JWT token
      // Strict validation: Fail fast if JWT_SECRET is not set in production
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret && process.env.NODE_ENV === 'production') {
        // In production, reject connections without valid JWT secret
        socket.data = { authenticated: false, error: 'JWT_SECRET not configured' };
        return next();
      }
      const secret = jwtSecret || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : 'development-fallback-secret');
      const decoded = jwt.verify(token, secret);

      // Store user info in socket data
      socket.data = {
        authenticated: true,
        token: token,
        userId: decoded.userId,
        userType: decoded.userType,
        role: decoded.role
      };

      // Track connection
      if (!connectedUsers.has(decoded.userId)) {
        connectedUsers.set(decoded.userId, []);
      }
      connectedUsers.get(decoded.userId).push(socket.id);

      next();
    } catch (error) {
      // Invalid token - allow connection but mark as unauthenticated
      socket.data = { authenticated: false, error: 'Invalid token' };
      next();
    }
  });

  // Connection event handler
  io.on('connection', (socket) => {
    const userData = socket.data;
    
    // Log connection (async to avoid blocking)
    import('./utils/logger.js').then(({ default: logger }) => {
      logger.debug(`WebSocket connection: ${socket.id} ${userData.authenticated ? `(User: ${userData.userId})` : '(Unauthenticated)'}`);
    }).catch(() => {
      // Fallback if logger unavailable
      if (process.env.NODE_ENV === 'development') {
        console.log(`📡 WebSocket connection: ${socket.id} ${userData.authenticated ? `(User: ${userData.userId})` : '(Unauthenticated)'}`);
      }
    });

    // Auto-join rooms based on user type/role
    if (userData.authenticated) {
      const rooms = [];
      
      // Role-based rooms
      if (userData.role) {
        rooms.push(`role:${String(userData.role).toLowerCase()}`);
      }
      if (userData.userType === 'admin') {
        rooms.push('role:admin');
        rooms.push('notifications:admin');
      }
      if (userData.userType === 'lydo_staff') {
        rooms.push('role:staff');
        rooms.push('notifications:staff');
      }
      if (userData.userType === 'sk_official') {
        rooms.push('role:sk_official');
        rooms.push('notifications:sk_official');
      }
      
      // User-specific room
      if (userData.userId) {
        rooms.push(`user:${userData.userId}`);
      }

      rooms.forEach(room => {
        socket.join(room);
      });
    }

    // Join custom rooms (from client)
    socket.on('join', ({ rooms }) => {
      if (Array.isArray(rooms)) {
        rooms.forEach(room => {
          if (typeof room === 'string') {
            socket.join(room);
          }
        });
      }
    });

    // Leave room
    socket.on('leave', ({ rooms }) => {
      if (Array.isArray(rooms)) {
        rooms.forEach(room => {
          if (typeof room === 'string') {
            socket.leave(room);
          }
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      if (userData.authenticated && userData.userId) {
        const userSockets = connectedUsers.get(userData.userId);
        if (userSockets) {
          const index = userSockets.indexOf(socket.id);
          if (index > -1) {
            userSockets.splice(index, 1);
          }
          if (userSockets.length === 0) {
            connectedUsers.delete(userData.userId);
          }
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      import('./utils/logger.js').then(({ default: logger }) => {
        logger.error(`WebSocket error (${socket.id})`, {
          message: error.message,
          stack: error.stack
        });
      }).catch(() => {
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ WebSocket error (${socket.id}):`, error);
        }
      });
    });
  });

  ioInstance = io;
  return ioInstance;
}

export function getIO() {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}

// Lazy import logger to avoid circular dependencies
let loggerInstance = null;
const getLogger = async () => {
  if (!loggerInstance) {
    try {
      const loggerModule = await import('./utils/logger.js');
      loggerInstance = loggerModule.default;
    } catch (error) {
      // Fallback to console if logger import fails
      loggerInstance = {
        debug: (...args) => console.log(...args),
        info: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args)
      };
    }
  }
  return loggerInstance;
};

/**
 * Emit event to all admins
 */
export function emitToAdmins(event, payload) {
  try {
    const io = getIO();
    io.to('role:admin').emit(event, payload);
    getLogger().then(logger => logger.debug(`Emitted '${event}' to admins`));
  } catch (error) {
    getLogger().then(logger => logger.error(`Failed to emit to admins`, { error: error.message, event }));
  }
}

/**
 * Emit event to specific role
 */
export function emitToRole(role, event, payload) {
  try {
    const io = getIO();
    io.to(`role:${role}`).emit(event, payload);
    getLogger().then(logger => logger.debug(`Emitted '${event}' to role: ${role}`));
  } catch (error) {
    getLogger().then(logger => logger.error(`Failed to emit to role ${role}`, { error: error.message, event }));
  }
}

/**
 * Emit event to specific room
 */
export function emitToRoom(room, event, payload) {
  try {
    const io = getIO();
    io.to(room).emit(event, payload);
    getLogger().then(logger => logger.debug(`Emitted '${event}' to room: ${room}`));
  } catch (error) {
    getLogger().then(logger => logger.error(`Failed to emit to room ${room}`, { error: error.message, event }));
  }
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId, event, payload) {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, payload);
    getLogger().then(logger => logger.debug(`Emitted '${event}' to user: ${userId}`));
  } catch (error) {
    getLogger().then(logger => logger.error(`Failed to emit to user ${userId}`, { error: error.message, event }));
  }
}

/**
 * Get connection count
 */
export function getConnectionCount() {
  return ioInstance ? ioInstance.sockets.sockets.size : 0;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount() {
  return connectedUsers.size;
}


