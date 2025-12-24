// Script to find booking for Phoo Pwint San
require('dotenv').config();
const mongoose = require('mongoose');

async function findBooking() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('Connecting to MongoDB:', MONGO_URI.replace(/\/\/.*:.*@/, '//****:****@'));
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));

    // Search for booking by customer name
    console.log('\n🔍 Searching for bookings with name containing "Phoo Pwint San"...');
    const bookingsByName = await Booking.find({
      'contactInfo.name': { $regex: 'Phoo Pwint San', $options: 'i' }
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`\nFound ${bookingsByName.length} booking(s) by name:`);
    bookingsByName.forEach((booking, index) => {
      console.log(`\n--- Booking ${index + 1} ---`);
      console.log('Booking ID:', booking._id);
      console.log('Customer Name:', booking.contactInfo?.name);
      console.log('Customer Email:', booking.contactInfo?.email);
      console.log('Status:', booking.status);
      console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
      console.log('Payment Intent ID:', booking.paymentInfo?.paymentIntentId);
      console.log('Stripe Payment Intent ID:', booking.paymentInfo?.stripePaymentIntentId);
      console.log('Date:', booking.date);
      console.log('Time:', booking.time);
      console.log('Created At:', booking.createdAt);
      console.log('Package Type:', booking.packageType);
      console.log('Package ID:', booking.packageId);
    });

    // Also search for recent pending bookings
    console.log('\n\n🔍 Searching for recent pending bookings (last 7 days)...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentPendingBookings = await Booking.find({
      createdAt: { $gte: sevenDaysAgo },
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\nFound ${recentPendingBookings.length} recent pending booking(s):`);
    recentPendingBookings.forEach((booking, index) => {
      console.log(`\n--- Pending Booking ${index + 1} ---`);
      console.log('Booking ID:', booking._id);
      console.log('Customer Name:', booking.contactInfo?.name);
      console.log('Customer Email:', booking.contactInfo?.email);
      console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
      console.log('Payment Intent ID:', booking.paymentInfo?.paymentIntentId);
      console.log('Stripe Payment Intent ID:', booking.paymentInfo?.stripePaymentIntentId);
      console.log('Created At:', booking.createdAt);
    });

    // Search for succeeded payment bookings
    console.log('\n\n🔍 Searching for recent succeeded payment bookings...');
    const succeededBookings = await Booking.find({
      createdAt: { $gte: sevenDaysAgo },
      'paymentInfo.paymentStatus': 'succeeded'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\nFound ${succeededBookings.length} recent succeeded booking(s):`);
    succeededBookings.forEach((booking, index) => {
      console.log(`\n--- Succeeded Booking ${index + 1} ---`);
      console.log('Booking ID:', booking._id);
      console.log('Customer Name:', booking.contactInfo?.name);
      console.log('Customer Email:', booking.contactInfo?.email);
      console.log('Status:', booking.status);
      console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
      console.log('Created At:', booking.createdAt);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findBooking();
