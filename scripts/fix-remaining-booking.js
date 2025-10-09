require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function findMissingBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the booking that's succeeded but not confirmed
    const missingBooking = await Booking.findOne({
      'paymentInfo.paymentStatus': 'succeeded',
      status: { $ne: 'confirmed' }
    });

    if (missingBooking) {
      console.log('Found booking that needs status update:');
      console.log(`ID: ${missingBooking._id}`);
      console.log(`Customer: ${missingBooking.contactInfo.name}`);
      console.log(`Status: ${missingBooking.status}`);
      console.log(`Payment Status: ${missingBooking.paymentInfo.paymentStatus}`);
      console.log(`Created: ${missingBooking.createdAt}`);

      // Update it
      await Booking.findByIdAndUpdate(missingBooking._id, {
        status: 'confirmed',
        updatedAt: new Date()
      });

      console.log('✅ Updated booking status to confirmed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findMissingBooking();