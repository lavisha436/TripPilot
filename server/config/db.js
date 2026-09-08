import mongoose from 'mongoose';
import { ENV } from './env.js';
import { migrateExistingActivities } from '../services/itineraryService.js';

/**
 * Connects to MongoDB Atlas / Local MongoDB instance using Mongoose.
 * Runs legacy activity migration on successful connection.
 * Exits process with code 1 if connection fails on startup.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI);
    console.log(`[MongoDB] Database connected successfully: ${conn.connection.host}`);

    // Run legacy database migration check asynchronously
    await migrateExistingActivities();
  } catch (error) {
    console.error(`[MongoDB] Database connection error: ${error.message}`);
    // Exit process with failure code if DB connection fails on startup
    process.exit(1);
  }
};
