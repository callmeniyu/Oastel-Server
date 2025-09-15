require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function debugBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const packageId = '68c26d0968b239abb121386e';

    // Find all bookings for this package
    const allBookings = await Booking.find({
      packageId: packageId,
      paymentStatus: 'succeeded'
    }).sort({ date: 1 });

    console.log(`Found ${allBookings.length} total bookings for package:`);
    
    allBookings.forEach(booking => {
      console.log(`Booking ${booking._id}:`);
      console.log(`  Date: ${booking.date} (${typeof booking.date})`);
      console.log(`  Time: ${booking.time}`);
      console.log(`  Guests: ${booking.numberOfGuests}`);
      console.log(`  Payment: ${booking.paymentStatus}`);
      console.log('---');
    });

    // Look specifically for September 16, 2025 bookings
    const targetDateStart = new Date('2025-09-16T00:00:00.000Z');
    const targetDateEnd = new Date('2025-09-17T00:00:00.000Z');
    
    console.log(`\nLooking for bookings between ${targetDateStart} and ${targetDateEnd}`);
    
    const septBookings = await Booking.find({
      packageId: packageId,
      date: {
        $gte: targetDateStart,
        $lt: targetDateEnd
      },
      paymentStatus: 'succeeded'
    });

    console.log(`Found ${septBookings.length} bookings for September 16, 2025`);
    
    let totalGuests = 0;
    septBookings.forEach(booking => {
      totalGuests += booking.numberOfGuests;
      console.log(`Sept 16 Booking: ${booking.numberOfGuests} guests, date: ${booking.date}`);
    });
    
    console.log(`Total guests for Sept 16: ${totalGuests}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugBookings();