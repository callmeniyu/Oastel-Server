const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');
    const BookingService = require('../src/services/booking.service').default;
    const booking = await BookingService.handleStripeSuccess({ paymentIntentId: 'pi_test_no_exist_123' });
    console.log('Result:', booking);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
