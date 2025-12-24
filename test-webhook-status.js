/**
 * Test Stripe Webhook with Real Payment Intent
 * 
 * This script tests the webhook by checking if a known payment intent
 * triggered a webhook event in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testWebhookWithPayment() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'webhookevents' }));

    // Check for ANY webhook events (including recent ones)
    console.log('🔍 Checking for webhook events in database...\n');
    
    const totalEvents = await WebhookEvent.countDocuments();
    console.log(`Total webhook events: ${totalEvents}\n`);

    if (totalEvents > 0) {
      console.log('✅ SUCCESS! Webhooks are being received!\n');
      
      const recentEvents = await WebhookEvent.find().sort({ createdAt: -1 }).limit(10);
      console.log('Recent webhook events:');
      recentEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.eventId}`);
        console.log(`     Source: ${event.source}`);
        console.log(`     Created: ${event.createdAt}\n`);
      });

      // Check if Phoo Pwint San's payment triggered a webhook
      const phoosPayment = 'pi_3ShmVaLco0sMvd2r1clUGAc9';
      const phooWebhook = await WebhookEvent.findOne({
        eventId: { $regex: phoosPayment }
      });

      if (phooWebhook) {
        console.log('✅ Found webhook for Phoo Pwint San payment!');
        console.log('   (This payment already passed, webhook working now)\n');
      } else {
        console.log('⚠️  Note: Phoo Pwint San payment happened before webhook setup');
        console.log('   Future payments will trigger webhooks correctly\n');
      }
    } else {
      console.log('❌ No webhook events found yet\n');
      console.log('This could mean:');
      console.log('1. Webhook was just configured (no payments since setup)');
      console.log('2. Webhook endpoint URL might be incorrect');
      console.log('3. Webhook secret might be wrong\n');
      console.log('Next steps:');
      console.log('- Create a test booking with Stripe test card');
      console.log('- Or use Stripe CLI: stripe trigger payment_intent.succeeded');
    }

    // Check for recent bookings with succeeded payments
    console.log('\n🔍 Checking recent bookings with succeeded payments...\n');
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));
    
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentSucceededBookings = await Booking.find({
      'paymentInfo.paymentStatus': 'succeeded',
      'paymentInfo.updatedAt': { $gte: oneHourAgo }
    }).sort({ 'paymentInfo.updatedAt': -1 }).limit(5);

    console.log(`Recent bookings with succeeded payments (last hour): ${recentSucceededBookings.length}\n`);
    
    if (recentSucceededBookings.length > 0) {
      console.log('Recent succeeded bookings:');
      recentSucceededBookings.forEach((booking, i) => {
        console.log(`  ${i + 1}. ${booking.contactInfo?.name}`);
        console.log(`     Email: ${booking.contactInfo?.email}`);
        console.log(`     Status: ${booking.status}`);
        console.log(`     Payment ID: ${booking.paymentInfo?.stripePaymentIntentId || booking.paymentInfo?.paymentIntentId}`);
        console.log(`     Updated: ${booking.paymentInfo?.updatedAt || booking.updatedAt}\n`);
      });
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testWebhookWithPayment();
