const mongoose = require('mongoose');
require('dotenv').config();

const BookingSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Booking = mongoose.model('Booking', BookingSchema);

async function fixBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find booking by partial ID
    const bookings = await Booking.find({}).lean();
    const booking = bookings.find(b => 
      b._id.toString().toUpperCase().includes('70E4B5E8')
    );
    
    if (!booking) {
      console.log('❌ Booking not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('=== CURRENT BOOKING DATA ===');
    console.log('ID:', booking._id.toString());
    console.log('Current date (UTC):', new Date(booking.date).toISOString());
    console.log('Current date (Malaysia):', new Date(booking.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
    console.log('Time:', booking.time);
    console.log('Customer:', booking.contactInfo?.name);
    
    // The booking date should be Dec 13, 2025
    // Current: 2025-12-13T00:00:00.000Z (midnight UTC = 8 AM Malaysia - WRONG)
    // Correct: 2025-12-13T04:00:00.000Z (4 AM UTC = noon Malaysia)
    const correctDate = new Date(Date.UTC(2025, 11, 13, 4, 0, 0)); // Month is 0-indexed
    
    console.log('\n=== FIXING BOOKING ===');
    console.log('Will update to:', correctDate.toISOString());
    console.log('Which displays as:', correctDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
    
    const result = await Booking.updateOne(
      { _id: booking._id },
      { $set: { date: correctDate } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('\n✅ Successfully updated booking date');
      
      // Verify the update
      const updated = await Booking.findById(booking._id).lean();
      console.log('\n=== UPDATED BOOKING ===');
      console.log('New date (UTC):', new Date(updated.date).toISOString());
      console.log('New date (Malaysia):', new Date(updated.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
    } else {
      console.log('\n⚠️ No changes made (date might already be correct)');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixBooking();
