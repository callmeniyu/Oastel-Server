const mongoose = require('mongoose');
require('dotenv').config();

const BookingSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Booking = mongoose.model('Booking', BookingSchema);

async function checkBooking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find booking by partial ID
    const bookings = await Booking.find({}).lean();
    const booking = bookings.find(b => 
      b._id.toString().toUpperCase().includes('C671EFFF')
    );
    
    if (booking) {
      console.log('=== BOOKING FOUND ===');
      console.log('Full ID:', booking._id.toString());
      console.log('\n--- Date Information ---');
      console.log('Date (raw):', booking.date);
      console.log('Date (ISO):', new Date(booking.date).toISOString());
      console.log('Date (Malaysia timezone):', new Date(booking.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
      console.log('Date (UTC string):', new Date(booking.date).toUTCString());
      console.log('\n--- Other Details ---');
      console.log('Time:', booking.time);
      console.log('Customer:', booking.contactInfo?.name);
      console.log('Email:', booking.contactInfo?.email);
      console.log('Package Type:', booking.packageType);
      console.log('Package ID:', booking.packageId);
      console.log('Status:', booking.status);
    } else {
      console.log('❌ Booking not found with ID containing C671EFFF');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkBooking();
