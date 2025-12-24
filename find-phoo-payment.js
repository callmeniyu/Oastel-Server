// Search for Phoo Pwint San booking by payment intent ID
require('dotenv').config();
const mongoose = require('mongoose');

async function findBookingByPaymentId() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));

    const paymentIntentId = 'pi_3ShmVaLco0sMvd2r1clUGAc9';
    const customerEmail = 'phoophoosanhpaan34@gmail.com';
    const customerName = 'Phoo Pwint San';

    console.log('🔍 Searching by Payment Intent ID...');
    const bookingByPaymentId = await Booking.find({
      $or: [
        { 'paymentInfo.paymentIntentId': paymentIntentId },
        { 'paymentInfo.stripePaymentIntentId': paymentIntentId }
      ]
    });

    console.log(`\nFound ${bookingByPaymentId.length} booking(s) by payment intent ID`);
    if (bookingByPaymentId.length > 0) {
      bookingByPaymentId.forEach((booking, index) => {
        console.log(`\n--- Booking ${index + 1} ---`);
        console.log('Booking ID:', booking._id);
        console.log('Customer Name:', booking.contactInfo?.name);
        console.log('Customer Email:', booking.contactInfo?.email);
        console.log('Status:', booking.status);
        console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
        console.log('Payment Intent:', booking.paymentInfo?.paymentIntentId);
        console.log('Stripe Payment Intent:', booking.paymentInfo?.stripePaymentIntentId);
        console.log('Created At:', booking.createdAt);
        console.log('Package Type:', booking.packageType);
        console.log('Package ID:', booking.packageId);
        console.log('Date:', booking.date);
        console.log('Time:', booking.time);
      });
    }

    console.log('\n\n🔍 Searching by Email Address...');
    const bookingByEmail = await Booking.find({
      'contactInfo.email': customerEmail
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${bookingByEmail.length} booking(s) by email`);
    if (bookingByEmail.length > 0) {
      bookingByEmail.forEach((booking, index) => {
        console.log(`\n--- Booking ${index + 1} ---`);
        console.log('Booking ID:', booking._id);
        console.log('Customer Name:', booking.contactInfo?.name);
        console.log('Status:', booking.status);
        console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
        console.log('Payment Intent:', booking.paymentInfo?.paymentIntentId);
        console.log('Created At:', booking.createdAt);
      });
    }

    console.log('\n\n🔍 Searching by Customer Name...');
    const bookingByName = await Booking.find({
      'contactInfo.name': { $regex: customerName, $options: 'i' }
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${bookingByName.length} booking(s) by name`);
    if (bookingByName.length > 0) {
      bookingByName.forEach((booking, index) => {
        console.log(`\n--- Booking ${index + 1} ---`);
        console.log('Booking ID:', booking._id);
        console.log('Customer Email:', booking.contactInfo?.email);
        console.log('Status:', booking.status);
        console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
        console.log('Created At:', booking.createdAt);
      });
    }

    // Check for bookings created around the payment time (Dec 24, 2025, 3:29-3:31 PM)
    console.log('\n\n🔍 Searching for bookings created around payment time (Dec 24, 3:25-3:35 PM)...');
    const paymentTime = new Date('2025-12-24T15:25:00.000Z'); // 3:25 PM UTC
    const paymentTimeEnd = new Date('2025-12-24T15:35:00.000Z'); // 3:35 PM UTC
    
    const bookingsAroundTime = await Booking.find({
      createdAt: { $gte: paymentTime, $lte: paymentTimeEnd }
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${bookingsAroundTime.length} booking(s) created around payment time`);
    if (bookingsAroundTime.length > 0) {
      bookingsAroundTime.forEach((booking, index) => {
        console.log(`\n--- Booking ${index + 1} ---`);
        console.log('Booking ID:', booking._id);
        console.log('Customer Name:', booking.contactInfo?.name);
        console.log('Customer Email:', booking.contactInfo?.email);
        console.log('Status:', booking.status);
        console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
        console.log('Payment Intent:', booking.paymentInfo?.paymentIntentId);
        console.log('Created At:', booking.createdAt);
      });
    }

    // Check webhook events for this payment intent
    console.log('\n\n🔍 Checking webhook events for this payment intent...');
    const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'webhookevents' }));
    
    const webhookEvents = await WebhookEvent.find({
      eventId: { $regex: paymentIntentId }
    });

    console.log(`\nFound ${webhookEvents.length} webhook event(s) for this payment`);
    if (webhookEvents.length > 0) {
      webhookEvents.forEach((event, index) => {
        console.log(`\n--- Webhook Event ${index + 1} ---`);
        console.log('Event ID:', event.eventId);
        console.log('Source:', event.source);
        console.log('Created At:', event.createdAt);
      });
    }

    if (bookingByPaymentId.length === 0 && bookingByEmail.length === 0 && bookingByName.length === 0) {
      console.log('\n\n❌ CRITICAL: No booking found for this payment!');
      console.log('This payment succeeded in Stripe but the booking was never created.');
      console.log('\nPayment Details:');
      console.log('- Payment Intent: pi_3ShmVaLco0sMvd2r1clUGAc9');
      console.log('- Amount: MYR 102.80');
      console.log('- Customer: Phoo Pwint San');
      console.log('- Email: phoophoosanhpaan34@gmail.com');
      console.log('- Package: 68c26d0968b239abb121386e (tour)');
      console.log('- Date: 2025-12-25');
      console.log('- Time: 08:15');
      console.log('- Adults: 2, Children: 0');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findBookingByPaymentId();
