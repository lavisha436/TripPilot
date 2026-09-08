import { createServer } from 'http';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { initSocket } from './socket.js';

/**
 * Boots the TripPilot AI backend service.
 * Connects to MongoDB Atlas first, initializes Socket.IO, then starts HTTP listener.
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB Atlas / Local MongoDB
    await connectDB();

    // 2. Wrap Express app in Node HTTP server
    const httpServer = createServer(app);

    // 3. Initialize Socket.IO engine attached to HTTP server
    initSocket(httpServer);

    // 4. Start HTTP server listener
    httpServer.listen(ENV.PORT, () => {
      console.log(`===================================================`);
      console.log(` 🚀 TripPilot AI Server running on PORT: ${ENV.PORT}`);
      console.log(` 🌐 Environment: ${ENV.NODE_ENV}`);
      console.log(` 🔗 Health check: http://localhost:${ENV.PORT}/api/v1/health`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error(`[Server] Critical startup failure: ${error.message}`);
    process.exit(1);
  }
};

startServer();
