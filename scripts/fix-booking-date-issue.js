#!/usr/bin/env node
/**
 * Script to fix booking date timezone issues
 * This fixes bookings where the date appears one day off due to timezone conversion
 * 
 * Usage:
 *   node server/scripts/fix-booking-date-issue.js --bookingId=6AF01C4C [--apply]
 * 
 * The --apply flag will actually update the booking, otherwise it's a dry run
 */

const mongoose = require('mongoose');
require('dotenv').config();

// We'll define the schema inline since importing from TypeScript is complex
const BookingSchema = new mongoose.Schema({
  userId: String,
  packageId: mongoose.Schema.Types.ObjectId,
  packageType: String,
  date: Date,
  time: String,
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    whatsapp: String
  },
  numberOfPeople: Number,
  paymentInfo: {
    paymentIntentId: String,
    paymentStatus: String,
    amount: Number,
    bankCharge: Number,
    currency: String,
    paymentMethod: String,
    refundStatus: String,
    refundAmount: Number
  },
  status: String,
  tourDetails: mongoose.Schema.Types.Mixed,
  transferDetails: mongoose.Schema.Types.Mixed,
  notes: String,
  preferredDrop: String,
  preferredPickup: String,
  subtotal: Number,
  total: Number,
  isAdminBooking: Boolean,
  isVehicleBooking: Boolean,
  vehicleSeatCapacity: Number,
  seatsRequested: Number,
  reviewEmailSent: Boolean,
  reviewEmailSentAt: Date
}, { timestamps: true });

async function main() {
  const argv = require('minimist')(process.argv.slice(2));
  const bookingId = argv.bookingId;
  const apply = !!argv.apply;

  if (!bookingId) {
    console.error('Usage: node server/scripts/fix-booking-date-issue.js --bookingId=<id> [--apply]');
    console.error('Example: node server/scripts/fix-booking-date-issue.js --bookingId=6AF01C4C --apply');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  try {
    // Register the model if not already registered
    const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
    
    // Find booking by partial ID (last 8 chars)
    const bookings = await Booking.find({}).lean();
    const booking = bookings.find(b => 
      b._id.toString().toUpperCase().endsWith(bookingId.toUpperCase())
    );

    if (!booking) {
      console.error(`❌ Booking not found with ID ending in: ${bookingId}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n📋 Found Booking:');
    console.log('Full ID:', booking._id.toString());
    console.log('Customer:', booking.contactInfo.name);
    console.log('Email:', booking.contactInfo.email);
    console.log('Package Type:', booking.packageType);
    console.log('Current stored date:', booking.date);
    console.log('Current stored date (ISO):', new Date(booking.date).toISOString());
    
    // Parse the date as Malaysia timezone to see what it should be
    const currentDate = new Date(booking.date);
    const malaysiaDateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    console.log('Current date in Malaysia timezone:', malaysiaDateStr);
    
    // The intended date is likely one day later
    const intendedDate = new Date(currentDate);
    intendedDate.setDate(intendedDate.getDate() + 1);
    const intendedDateStr = intendedDate.toISOString().split('T')[0];
    
    console.log('\n🔧 Proposed Fix:');
    console.log('Intended date:', intendedDateStr);
    console.log('New date object:', new Date(intendedDateStr + 'T12:00:00.000Z').toISOString());
    
    if (!apply) {
      console.log('\n⚠️  DRY RUN - No changes made');
      console.log('To apply the fix, run with --apply flag');
      await mongoose.disconnect();
      return;
    }

    // Apply the fix
    const updateResult = await Booking.updateOne(
      { _id: booking._id },
      { 
        $set: { 
          date: new Date(intendedDateStr + 'T12:00:00.000Z')
        }
      }
    );

    console.log('\n✅ Booking updated successfully!');
    console.log('Modified count:', updateResult.modifiedCount);
    
    // Verify the update
    const updatedBooking = await Booking.findById(booking._id).lean();
    console.log('\n📋 Updated Booking:');
    console.log('New stored date:', updatedBooking.date);
    console.log('New stored date (ISO):', new Date(updatedBooking.date).toISOString());
    const newMalaysiaDateStr = new Date(updatedBooking.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    console.log('New date in Malaysia timezone:', newMalaysiaDateStr);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
