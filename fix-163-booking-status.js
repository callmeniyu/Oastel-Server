/**
 * CRITICAL FIX: Update 163 bookings with paymentStatus 'succeeded' but status not 'confirmed'
 * 
 * Issue: Database scan revealed 163 bookings where payment succeeded but booking status
 * is stuck in 'completed' or 'pending' instead of 'confirmed'. This causes them to not
 * appear in admin panel's confirmed bookings list.
 * 
 * Root Cause: Webhook handler or booking creation logic failed to update status field
 * when payment succeeded.
 * 
 * Fix: Bulk update all bookings where:
 *   - paymentInfo.paymentStatus = 'succeeded'
 *   - status != 'confirmed'
 * 
 * Set status = 'confirmed'
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string from environment
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI environment variable not set');
  process.exit(1);
}

// Define Booking schema (minimal for this operation)
const bookingSchema = new mongoose.Schema({
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
  paymentInfo: {
    paymentStatus: { type: String, enum: ['pending', 'processing', 'succeeded', 'failed'] }
  },
  customerInfo: {
    name: String,
    email: String
  },
  packageTitle: String,
  type: String,
  date: Date,
  createdAt: Date
}, { collection: 'bookings' });

const Booking = mongoose.model('Booking', bookingSchema);

async function fixBookingStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Finding bookings with mismatched status...');
    
    // Find all bookings where payment succeeded but status is not confirmed
    const mismatchedBookings = await Booking.find({
      'paymentInfo.paymentStatus': 'succeeded',
      'status': { $ne: 'confirmed' }
    }).select('_id status paymentInfo.paymentStatus customerInfo.name customerInfo.email packageTitle type date createdAt');

    console.log(`\n📊 Found ${mismatchedBookings.length} bookings with status mismatch\n`);

    if (mismatchedBookings.length === 0) {
      console.log('✅ No mismatched bookings found. Database is already consistent!');
      await mongoose.connection.close();
      return;
    }

    // Show first 10 examples
    console.log('📋 Sample of bookings to be fixed (first 10):');
    console.log('═'.repeat(80));
    mismatchedBookings.slice(0, 10).forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking._id}`);
      console.log(`   Customer: ${booking.customerInfo?.name || 'Unknown'} (${booking.customerInfo?.email || 'Unknown'})`);
      console.log(`   Package: ${booking.packageTitle}`);
      console.log(`   Current Status: ${booking.status} → Will be: confirmed`);
      console.log(`   Payment Status: ${booking.paymentInfo?.paymentStatus}`);
      console.log(`   Date: ${booking.date?.toISOString()}`);
      console.log();
    });

    // Perform bulk update
    console.log(`\n🔄 Updating ${mismatchedBookings.length} bookings...`);
    
    const result = await Booking.updateMany(
      {
        'paymentInfo.paymentStatus': 'succeeded',
        'status': { $ne: 'confirmed' }
      },
      {
        $set: {
          'status': 'confirmed',
          'paymentInfo.updatedAt': new Date()
        }
      }
    );

    console.log('\n✅ Update Complete!');
    console.log('═'.repeat(80));
    console.log(`📊 Matched Documents: ${result.matchedCount}`);
    console.log(`✏️  Modified Documents: ${result.modifiedCount}`);
    console.log(`🆔 Update Acknowledged: ${result.acknowledged ? 'Yes' : 'No'}`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const stillMismatched = await Booking.countDocuments({
      'paymentInfo.paymentStatus': 'succeeded',
      'status': { $ne: 'confirmed' }
    });

    if (stillMismatched === 0) {
      console.log('✅ Verification SUCCESS: All bookings with succeeded payments now have confirmed status!');
    } else {
      console.log(`⚠️  Warning: ${stillMismatched} bookings still have mismatched status`);
    }

    // Show updated statistics
    console.log('\n📊 Final Statistics:');
    console.log('═'.repeat(80));
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: {
            status: '$status',
            paymentStatus: '$paymentInfo.paymentStatus'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.status': 1, '_id.paymentStatus': 1 } }
    ]);

    stats.forEach(stat => {
      console.log(`Status: ${stat._id.status || 'none'} | Payment: ${stat._id.paymentStatus || 'none'} → Count: ${stat.count}`);
    });

    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    console.log('✅ Fix completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Execute the fix
fixBookingStatus();
