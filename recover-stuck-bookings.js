/**
 * Recovery Script for Stuck Pending Bookings
 * 
 * This script fixes bookings that have succeeded payment status but are stuck in "pending" status.
 * It will:
 * 1. Find all bookings with paymentStatus='succeeded' but status='pending'
 * 2. Update them to status='confirmed'
 * 3. Send confirmation emails to customers and admin
 * 4. Copy paymentIntentId to stripePaymentIntentId for webhook compatibility
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function recoverStuckBookings() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));

    // Find all bookings with succeeded payment but pending status
    console.log('🔍 Finding stuck bookings (paymentStatus=succeeded, status=pending)...\n');
    const stuckBookings = await Booking.find({
      'paymentInfo.paymentStatus': 'succeeded',
      'status': 'pending'
    }).sort({ createdAt: -1 });

    console.log(`Found ${stuckBookings.length} stuck booking(s)\n`);

    if (stuckBookings.length === 0) {
      console.log('✅ No stuck bookings found. All bookings are properly synced!');
      return;
    }

    // Display stuck bookings
    console.log('=== STUCK BOOKINGS ===\n');
    stuckBookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking._id}`);
      console.log(`   Customer: ${booking.contactInfo?.name} (${booking.contactInfo?.email})`);
      console.log(`   Payment Intent: ${booking.paymentInfo?.paymentIntentId || 'N/A'}`);
      console.log(`   Stripe Payment Intent: ${booking.paymentInfo?.stripePaymentIntentId || 'NOT SET'}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log(`   Package Type: ${booking.packageType}`);
      console.log(`   Date: ${booking.date}`);
      console.log(`   Time: ${booking.time}\n`);
    });

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will update all stuck bookings to confirmed status and send emails.\n');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update bookings
    console.log('🔧 Updating stuck bookings...\n');
    
    let successCount = 0;
    let emailCount = 0;
    let errorCount = 0;

    for (const booking of stuckBookings) {
      try {
        // Update booking status and set stripePaymentIntentId if missing
        const updateData = {
          status: 'confirmed',
          'paymentInfo.updatedAt': new Date()
        };

        // Copy paymentIntentId to stripePaymentIntentId for webhook compatibility
        if (booking.paymentInfo?.paymentIntentId && !booking.paymentInfo?.stripePaymentIntentId) {
          updateData['paymentInfo.stripePaymentIntentId'] = booking.paymentInfo.paymentIntentId;
        }

        await Booking.updateOne(
          { _id: booking._id },
          { $set: updateData }
        );

        successCount++;
        console.log(`✅ Updated booking ${booking._id} to confirmed status`);

        // Try to send confirmation email
        try {
          // Import email service dynamically to avoid issues
          const { EmailService } = require('../src/services/email.service');
          const emailService = new EmailService();

          // Fetch package details
          const PackageModel = booking.packageType === 'tour' 
            ? mongoose.model('Tour', new mongoose.Schema({}, { strict: false }))
            : mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));
          
          const packageDetails = await PackageModel.findById(booking.packageId);

          if (packageDetails) {
            const emailData = {
              customerName: booking.contactInfo.name,
              customerEmail: booking.contactInfo.email,
              bookingId: booking._id.toString(),
              packageId: booking.packageId.toString(),
              packageName: packageDetails.title || packageDetails.name || 'Package',
              packageType: booking.packageType,
              from: booking.from || packageDetails.from || '',
              to: booking.to || packageDetails.to || '',
              date: booking.date instanceof Date 
                ? booking.date.toISOString().split('T')[0] 
                : booking.date,
              time: booking.time,
              adults: booking.adults,
              children: booking.children || 0,
              pickupLocation: booking.pickupLocation,
              pickupGuidelines: packageDetails.pickupGuidelines || '',
              total: booking.total,
              currency: booking.paymentInfo?.currency || 'MYR',
              isVehicleBooking: booking.isVehicleBooking || false,
              vehicleName: booking.vehicleName || '',
              vehicleSeatCapacity: booking.vehicleSeatCapacity || 0
            };

            const emailSent = await emailService.sendBookingConfirmation(emailData);
            if (emailSent) {
              emailCount++;
              console.log(`   📧 Confirmation email sent to ${booking.contactInfo.email}`);
            } else {
              console.log(`   ⚠️  Failed to send email to ${booking.contactInfo.email}`);
            }
          } else {
            console.log(`   ⚠️  Package not found for booking ${booking._id}`);
          }
        } catch (emailError) {
          console.error(`   ❌ Error sending email for booking ${booking._id}:`, emailError.message);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating booking ${booking._id}:`, error.message);
      }
    }

    console.log('\n=== RECOVERY SUMMARY ===');
    console.log(`✅ Successfully updated: ${successCount} booking(s)`);
    console.log(`📧 Emails sent: ${emailCount} email(s)`);
    console.log(`❌ Errors: ${errorCount} error(s)`);
    console.log('\n🎉 Recovery process completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the recovery script
recoverStuckBookings().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
