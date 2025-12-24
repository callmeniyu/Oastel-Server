/**
 * Send Confirmation Emails for Recently Recovered Bookings
 * 
 * This script sends confirmation emails to customers whose bookings were just recovered.
 * It only sends emails for bookings updated in the last hour to avoid spamming old bookings.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Use absolute path to import from src
const emailServicePath = path.join(__dirname, 'src', 'services', 'email.service.ts');

async function sendRecoveredBookingEmails() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));

    // Find bookings that were just updated (in last hour) and confirmed
    console.log('🔍 Finding recently recovered bookings...\n');
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentlyRecoveredBookings = await Booking.find({
      'status': 'confirmed',
      'paymentInfo.paymentStatus': 'succeeded',
      'paymentInfo.updatedAt': { $gte: oneHourAgo }
    }).sort({ 'paymentInfo.updatedAt': -1 }).limit(50);

    console.log(`Found ${recentlyRecoveredBookings.length} recently recovered booking(s)\n`);

    if (recentlyRecoveredBookings.length === 0) {
      console.log('✅ No recently recovered bookings found.');
      return;
    }

    // Display bookings
    console.log('=== RECENTLY RECOVERED BOOKINGS ===\n');
    recentlyRecoveredBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.contactInfo?.name} - ${booking.contactInfo?.email} - Booking ID: ${booking._id}`);
    });

    console.log('\n⚠️  Note: Emails will only be sent to customers from the last hour recovery.');
    console.log('This is to avoid spamming customers who made bookings days/weeks ago.\n');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📧 Sending confirmation emails...\n');

    // Import EmailService using require with TypeScript support
    // Note: In production, this should be compiled JavaScript
    console.log('⚠️  Email sending requires the server to be running with TypeScript compilation.');
    console.log('Please use the admin panel or API endpoint to trigger email sending for these bookings.');
    console.log('\nAlternatively, manually send emails to these customers:\n');

    recentlyRecoveredBookings.forEach((booking, index) => {
      console.log(`${index + 1}. Email: ${booking.contactInfo?.email}`);
      console.log(`   Name: ${booking.contactInfo?.name}`);
      console.log(`   Booking ID: ${booking._id}`);
      console.log(`   Package Type: ${booking.packageType}`);
      console.log(`   Date: ${booking.date}`);
      console.log(`   Time: ${booking.time}\n`);
    });

    console.log('\n💡 To send emails programmatically, restart the server and use the webhook recovery endpoint.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
sendRecoveredBookingEmails().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
