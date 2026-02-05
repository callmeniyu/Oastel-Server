/**
 * Fix specific booking date for Carlos Moreno Vega
 * Booking ID: 6984a278bb25b1c463e62b0a
 * 
 * Issue: Date stored as 2026-02-04T16:00:00.000Z (Feb 5 in Malaysia)
 * Should be: 2026-02-05T16:00:00.000Z (Feb 6 in Malaysia)
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixBooking() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));

    // Find the booking
    const bookingId = '6984a278bb25b1c463e62b0a';
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    console.log('\n📋 Current Booking Details:');
    console.log(`Customer: ${booking.contactInfo.name}`);
    console.log(`Email: ${booking.contactInfo.email}`);
    console.log(`Current Date (UTC): ${booking.date.toISOString()}`);
    console.log(`Current Date (Malaysia): ${booking.date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}`);

    // The correct date should be February 6, 2026 at 00:00 Malaysia time
    // Which is February 5, 2026 at 16:00 UTC
    const correctDate = new Date('2026-02-05T16:00:00.000Z');
    
    console.log('\n🔧 Updating to:');
    console.log(`New Date (UTC): ${correctDate.toISOString()}`);
    console.log(`New Date (Malaysia): ${correctDate.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}`);

    // Update the booking using findByIdAndUpdate to ensure it's saved
    const result = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: { date: correctDate } },
      { new: true }
    );

    console.log('\n✅ Booking date updated successfully!');
    
    // Verify the update
    const updatedBooking = await Booking.findById(bookingId);
    console.log('\n🔍 Verification:');
    console.log(`Updated Date (UTC): ${updatedBooking.date.toISOString()}`);
    console.log(`Updated Date (Malaysia): ${updatedBooking.date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBooking();
