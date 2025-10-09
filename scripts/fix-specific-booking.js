require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function fixSpecificBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('🔧 FIXING SPECIFIC BOOKING STATUS');
    console.log('=================================');
    
    // Get current booking details
    const beforeBooking = await Booking.findById('68cc6dcd5d8439430d0f5235');
    
    if (!beforeBooking) {
      console.log('❌ Booking not found!');
      return;
    }
    
    console.log('📋 BEFORE UPDATE:');
    console.log(`  ID: ${beforeBooking._id}`);
    console.log(`  Customer: ${beforeBooking.contactInfo.name}`);
    console.log(`  Status: ${beforeBooking.status}`);
    console.log(`  Payment Status: ${beforeBooking.paymentInfo.paymentStatus}`);
    console.log(`  User ID: ${beforeBooking.userId || 'NONE'}`);
    
    // Update the booking status
    const updatedBooking = await Booking.findByIdAndUpdate(
      '68cc6dcd5d8439430d0f5235',
      {
        status: 'confirmed',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log('\n✅ AFTER UPDATE:');
    console.log(`  ID: ${updatedBooking._id}`);
    console.log(`  Customer: ${updatedBooking.contactInfo.name}`);
    console.log(`  Status: ${updatedBooking.status}`);
    console.log(`  Payment Status: ${updatedBooking.paymentInfo.paymentStatus}`);
    console.log(`  User ID: ${updatedBooking.userId || 'NONE'}`);
    console.log(`  Updated At: ${updatedBooking.updatedAt}`);
    
    console.log('\n🎉 Booking status successfully updated to "confirmed"!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixSpecificBooking();