require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function updateBookingStatuses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('🔧 UPDATING BOOKING STATUSES');
    console.log('=============================');

    // Update all succeeded payments to confirmed status
    const result = await Booking.updateMany(
      {
        'paymentInfo.paymentStatus': 'succeeded',
        status: 'pending'
      },
      {
        $set: {
          status: 'confirmed',
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} bookings from 'pending' to 'confirmed'`);

    // Verify the results
    const confirmedBookings = await Booking.countDocuments({
      'paymentInfo.paymentStatus': 'succeeded',
      status: 'confirmed'
    });

    const pendingWithSucceeded = await Booking.countDocuments({
      'paymentInfo.paymentStatus': 'succeeded',
      status: 'pending'
    });

    console.log(`\n📊 VERIFICATION:`);
    console.log(`✅ Confirmed bookings with succeeded payment: ${confirmedBookings}`);
    console.log(`⏳ Pending bookings with succeeded payment: ${pendingWithSucceeded}`);

    if (pendingWithSucceeded === 0) {
      console.log('🎉 All succeeded payments now have confirmed status!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateBookingStatuses();