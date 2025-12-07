const mongoose = require('mongoose');
require('dotenv').config();

const BookingSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Booking = mongoose.model('Booking', BookingSchema);

async function fixBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find the booking
    const bookings = await Booking.find({}).lean();
    const booking = bookings.find(b => 
      b._id.toString().toUpperCase().includes('C671EFFF')
    );
    
    if (!booking) {
      console.log('❌ Booking not found');
      process.exit(1);
    }
    
    console.log('=== CURRENT STATE ===');
    console.log('Current date (ISO):', new Date(booking.date).toISOString());
    console.log('Current date (Malaysia TZ):', new Date(booking.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
    
    // Fix: Change from 2026-02-08T17:00:00.000Z to 2026-02-08T04:00:00.000Z
    // 4 AM UTC = noon Malaysia time (UTC+8)
    const correctDate = new Date(Date.UTC(2026, 1, 8, 4, 0, 0)); // Month is 0-indexed
    
    console.log('\n=== PROPOSED FIX ===');
    console.log('New date (ISO):', correctDate.toISOString());
    console.log('New date (Malaysia TZ):', correctDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
    
    // Update the booking
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { date: correctDate } }
    );
    
    console.log('\n✅ Booking updated successfully!');
    console.log('Booking ID:', booking._id.toString());
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixBooking();
