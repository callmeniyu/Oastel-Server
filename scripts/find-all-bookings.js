require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function findAllBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find any bookings with succeeded status
    const recentBookings = await Booking.find({
      paymentStatus: 'succeeded'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`Found ${recentBookings.length} recent succeeded bookings:`);
    
    recentBookings.forEach(booking => {
      console.log(`Booking ${booking._id}:`);
      console.log(`  Package ID: ${booking.packageId}`);
      console.log(`  Date: ${booking.date} (${typeof booking.date})`);
      console.log(`  Time: ${booking.time}`);
      console.log(`  Guests: ${booking.numberOfGuests}`);
      console.log(`  Payment: ${booking.paymentStatus}`);
      console.log(`  Created: ${booking.createdAt}`);
      console.log('---');
    });

    // Check if there are any bookings with the target package name or similar
    const allBookings = await Booking.find({}).limit(5);
    console.log(`\nTotal bookings in database: ${await Booking.countDocuments()}`);
    console.log('Sample booking structure:');
    if (allBookings.length > 0) {
      console.log(JSON.stringify(allBookings[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

findAllBookings();