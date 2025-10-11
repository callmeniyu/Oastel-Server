const mongoose = require('mongoose');
require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Booking = require('../dist/models/Booking').default || require('../src/models/Booking');
const BookingService = require('../dist/services/booking.service').default || require('../src/services/booking.service');

async function reconcile() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find bookings with stripePaymentIntentId and paymentStatus not succeeded
    const bookings = await Booking.find({ 'paymentInfo.stripePaymentIntentId': { $exists: true, $ne: null }, 'paymentInfo.paymentStatus': { $ne: 'succeeded' } });
    console.log(`Found ${bookings.length} bookings to reconcile`);

    for (const b of bookings) {
      const pid = b.paymentInfo.stripePaymentIntentId;
      try {
        const intent = await stripe.paymentIntents.retrieve(pid);
        console.log(`Intent ${pid} status: ${intent.status}`);
        if (intent.status === 'succeeded') {
          await BookingService.handleStripeSuccess({ bookingId: b._id.toString(), paymentIntentId: pid, amount: intent.amount / 100, currency: intent.currency });
        } else if (intent.status === 'requires_payment_method' || intent.status === 'canceled' || intent.status === 'failed') {
          await BookingService.handleStripeFailure({ bookingId: b._id.toString(), paymentIntentId: pid, reason: intent.last_payment_error?.message || intent.status });
        } else {
          console.log(`Skipping intent ${pid} with status ${intent.status}`);
        }
      } catch (err) {
        console.error('Error retrieving intent', pid, err.message || err);
      }
    }

    console.log('Reconciliation complete');
  } catch (err) {
    console.error('Error during reconciliation', err);
  } finally {
    await mongoose.disconnect();
  }
}

reconcile();
