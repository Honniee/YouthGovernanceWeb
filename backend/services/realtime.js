import { 
  getIO, 
  emitToRole, 
  emitToRoom, 
  emitToAdmins, 
  emitToUser 
} from '../server-socket.js';

/**
 * Realtime Service
 * Helper functions for emitting WebSocket events
 * Now uses enhanced functions from server-socket.js
 */

// Re-export enhanced functions
export { emitToRole, emitToRoom, emitToAdmins, emitToUser };

/**
 * Emit to all connected clients
 */
export const emitBroadcast = (event, payload) => {
  try { 
    const io = getIO();
    io.emit(event, payload);
    // Log asynchronously to avoid blocking
    import('../utils/logger.js').then(({ default: logger }) => {
      logger.debug(`Broadcast '${event}' to all clients`);
    }).catch(() => {
      // Silently fail if logger unavailable
    });
  } catch (error) {
    import('../utils/logger.js').then(({ default: logger }) => {
      logger.error(`Failed to broadcast '${event}'`, { error: error.message });
    }).catch(() => {
      // Silently fail if logger unavailable
    });
  }
};


