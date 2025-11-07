import { getIO } from '../server-socket.js';

export const emitToRole = (role, event, payload) => {
  try { getIO().to(`role:${role}`).emit(event, payload); } catch (_) {}
};

export const emitToRoom = (room, event, payload) => {
  try { getIO().to(room).emit(event, payload); } catch (_) {}
};

export const emitToAdmins = (event, payload) => emitToRole('admin', event, payload);

export const emitBroadcast = (event, payload) => {
  try { getIO().emit(event, payload); } catch (_) {}
};


