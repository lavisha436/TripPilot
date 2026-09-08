import { Server as SocketIOServer } from 'socket.io';
import { ENV } from './config/env.js';
import { verifyToken } from './utils/tokenUtils.js';
import { User } from './models/User.js';

let io = null;

/**
 * Helper to safely parse cookie string from HTTP handshake headers.
 * 
 * @param {string} cookieHeader - Raw cookie header string from socket.handshake.headers.cookie.
 * @returns {Object} Parsed cookie key-value dictionary.
 */
const parseCookies = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=');
    const key = parts[0];
    const value = parts.slice(1).join('=');
    if (key && value) {
      acc[key.trim()] = decodeURIComponent(value.trim());
    }
    return acc;
  }, {});
};

/**
 * Initializes and configures the Socket.IO server instance attached to the Node HTTP server.
 * 
 * @param {import('http').Server} httpServer - Node HTTP server instance.
 * @returns {SocketIOServer} Configured Socket.IO server instance.
 */
export const initSocket = (httpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ENV.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO Authentication Middleware (Reuses existing JWT & User Model)
  io.use(async (socket, next) => {
    try {
      // Step 1: Extract HTTP-Only "token" cookie from handshake request headers
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      let token = cookies.token;

      // Fallback: Check Bearer token header or auth payload
      if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      } else if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        console.log('[Socket.IO] Authentication failed: No token cookie provided');
        return next(new Error('Authentication failed'));
      }

      // Step 2: Verify JWT signature and expiration
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        console.log('[Socket.IO] Authentication failed: Invalid or expired token');
        return next(new Error('Authentication failed'));
      }

      // Step 3: Resolve active user from database
      const currentUser = await User.findById(decoded.id).select('-password');
      if (!currentUser || !currentUser.isActive) {
        console.log('[Socket.IO] Authentication failed: User not found or inactive');
        return next(new Error('Authentication failed'));
      }

      // Step 4: Security Check - Check if password was changed after token issuance
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        console.log('[Socket.IO] Authentication failed: Password changed recently');
        return next(new Error('Authentication failed'));
      }

      // Step 5: Attach authenticated user to socket instance
      socket.user = currentUser;
      next();
    } catch (error) {
      console.log('[Socket.IO] Authentication failed: Internal verification error');
      return next(new Error('Authentication failed'));
    }
  });

  // Connection Handler & Private Room Setup
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userRoom = `user:${userId}`;

    // Join private user-specific notification room
    socket.join(userRoom);

    console.log(`[Socket.IO] Authenticated user: ${userId}`);
    console.log(`[Socket.IO] User joined room: ${userRoom}`);
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log(`[Socket.IO] Real-time engine initialized with CORS origin: ${ENV.CLIENT_URL}`);
  return io;
};

/**
 * Getter to safely retrieve the initialized Socket.IO instance.
 * Throws an explicit error if accessed before initialization.
 * 
 * @returns {SocketIOServer} Active Socket.IO server instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet. Call initSocket(httpServer) first.');
  }
  return io;
};
