/**
 * Scheduled job to mark past confirmed bookings as completed
 * This should run once per day (e.g., at midnight) via cron
 * 
 * Usage:
 * - Can be called manually: node dist/jobs/markCompletedBookings.js
 * - Or set up as a cron job to run automatically
 */

import BookingService from '../services/booking.service';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function markCompletedBookings() {
  try {
    console.log('🔄 Starting job: Mark past confirmed bookings as completed');
    
    // Connect to database
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not set in environment');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Run the booking service method
    await BookingService.markPastBookingsCompleted();
    
    console.log('✅ Job completed successfully');
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error in markCompletedBookings job:', error);
    process.exit(1);
  }
}

// Run the job
markCompletedBookings();
