// Script to find ALL recent bookings including "Phoo Pwint San"
require('dotenv').config();
const mongoose = require('mongoose');

async function findAllRecentBookings() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));

    // Search for ALL recent bookings (last 24 hours)
    console.log('\n🔍 Searching for ALL bookings in last 24 hours...');
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentBookings = await Booking.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 });

    console.log(`\nFound ${recentBookings.length} booking(s) in last 24 hours:\n`);
    recentBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.contactInfo?.name} | ${booking.contactInfo?.email} | Status: ${booking.status} | Payment: ${booking.paymentInfo?.paymentStatus} | Created: ${booking.createdAt}`);
    });

    // Search by partial name match
    console.log('\n\n🔍 Searching for names containing "Phoo", "Pwint", or "San"...');
    const similarNames = await Booking.find({
      $or: [
        { 'contactInfo.name': { $regex: 'Phoo', $options: 'i' } },
        { 'contactInfo.name': { $regex: 'Pwint', $options: 'i' } },
        { 'contactInfo.name': { $regex: 'San', $options: 'i' } },
        { 'contactInfo.email': { $regex: 'phoo', $options: 'i' } },
        { 'contactInfo.email': { $regex: 'pwint', $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\nFound ${similarNames.length} booking(s) with similar names:`);
    similarNames.forEach((booking, index) => {
      console.log(`\n--- Match ${index + 1} ---`);
      console.log('Booking ID:', booking._id);
      console.log('Customer Name:', booking.contactInfo?.name);
      console.log('Customer Email:', booking.contactInfo?.email);
      console.log('Status:', booking.status);
      console.log('Payment Status:', booking.paymentInfo?.paymentStatus);
      console.log('Created At:', booking.createdAt);
    });

    // Check WebhookEvent collection
    console.log('\n\n🔍 Checking recent webhook events...');
    const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'webhookevents' }));
    const recentWebhooks = await WebhookEvent.find().sort({ createdAt: -1 }).limit(10);
    
    console.log(`\nFound ${recentWebhooks.length} recent webhook event(s):`);
    recentWebhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. Event ID: ${webhook.eventId} | Source: ${webhook.source} | Created: ${webhook.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

findAllRecentBookings();
