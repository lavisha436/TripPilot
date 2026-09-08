import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { ApiResponse } from './utils/ApiResponse.js';
import { ApiError } from './utils/ApiError.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import itineraryRoutes from './routes/itineraryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';

const app = express();

// 1. Configure CORS for cross-origin credentials with Vite React client
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 2. Request body & cookie parsing middlewares
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// 3. Base Health Check API Endpoint
app.get('/api/v1/health', (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      'TripPilot AI Backend Service is running healthy.'
    )
  );
});

// 4. API Domain Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/trips/:tripId/activities', activityRoutes);
app.use('/api/v1/trips/:tripId/itineraries', itineraryRoutes);
app.use('/api/v1/trips/:tripId/expenses', expenseRoutes);
app.use('/api/v1/trips/:tripId/gallery', galleryRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 5. 404 Catch-All Route for non-existent endpoints
app.use('*', (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found on this server.`));
});

// 5. Global Error Handling Middleware (must be registered last)
app.use(errorHandler);

export { app };
