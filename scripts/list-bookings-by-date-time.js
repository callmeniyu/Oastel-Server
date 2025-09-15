// List bookings for a specific date and time to check payment status and date formats
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}
const mongoose = require('mongoose');

const DATE = process.argv[2] || '2025-09-17';
const TIME = process.argv[3] || '08:00';

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    connectTimeoutMS: 30000,
  });

  const db = mongoose.connection.db;

  // Find bookings for the date and time
  const bookings = await db.collection('bookings').find({ date: DATE, time: TIME }).toArray();

  if (!bookings || bookings.length === 0) {
    console.log(`No bookings found for ${DATE} ${TIME}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${bookings.length} bookings for ${DATE} ${TIME}`);
  for (const b of bookings) {
    console.log('--------------------------------------------------');
    console.log('Booking ID:', b._id);
    console.log('Package Type:', b.packageType);
    console.log('Package ID:', b.packageId);
    console.log('Date field:', b.date);
    console.log('Time:', b.time);
    console.log('Adults:', b.adults, 'Children:', b.children);
    console.log('isVehicleBooking:', b.isVehicleBooking);
    console.log('PaymentInfo:', b.paymentInfo);
    console.log('Status:', b.status);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run();
