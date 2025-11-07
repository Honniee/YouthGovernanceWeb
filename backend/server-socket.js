import { Server } from 'socket.io';

let ioInstance = null;

export function initSocket(httpServer) {
  if (ioInstance) return ioInstance;

  const allowedOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*';
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigin, methods: ['GET','POST','PATCH','PUT','DELETE'] }
  });

  io.use(async (socket, next) => {
    // Basic JWT passthrough; verify upstream if you have util
    const token = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization?.replace('Bearer ', '') || '';
    socket.data = socket.data || {};
    socket.data.token = token;
    // In this first phase we skip verification; controllers still enforce auth
    return next();
  });

  io.on('connection', (socket) => {
    // Optional: client may emit join with role/room info later
    socket.on('join', ({ rooms }) => {
      if (Array.isArray(rooms)) rooms.forEach(r => typeof r === 'string' && socket.join(r));
    });
  });

  ioInstance = io;
  return ioInstance;
}

export function getIO() {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}


