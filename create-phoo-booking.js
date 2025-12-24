/**
 * Manually Create Booking for Phoo Pwint San
 * 
 * This booking had a successful Stripe payment but was never created in the database.
 * This script will create the booking manually based on the Stripe payment metadata.
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function createMissingBooking() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define models
    const BookingSchema = new mongoose.Schema({}, { strict: false, collection: 'bookings' });
    const Booking = mongoose.model('Booking', BookingSchema);

    const TourSchema = new mongoose.Schema({}, { strict: false, collection: 'tours' });
    const Tour = mongoose.model('Tour', TourSchema);

    // Payment and booking details from Stripe
    const paymentIntentId = 'pi_3ShmVaLco0sMvd2r1clUGAc9';
    const packageId = '68c26d0968b239abb121386e';
    const bookingDate = new Date('2025-12-25T04:00:00.000Z'); // Dec 25, 2025
    const bookingTime = '08:15';
    const adults = 2;
    const children = 0;
    const amount = 102.80; // MYR
    const customerName = 'Phoo Pwint San';
    const customerEmail = 'phoophoosanhpaan34@gmail.com';

    console.log('📋 Booking Details:');
    console.log('- Customer:', customerName);
    console.log('- Email:', customerEmail);
    console.log('- Payment Intent:', paymentIntentId);
    console.log('- Package ID:', packageId);
    console.log('- Date:', bookingDate.toISOString().split('T')[0]);
    console.log('- Time:', bookingTime);
    console.log('- Adults:', adults);
    console.log('- Children:', children);
    console.log('- Amount: MYR', amount);

    // Verify the booking doesn't already exist
    const existingBooking = await Booking.findOne({
      $or: [
        { 'paymentInfo.paymentIntentId': paymentIntentId },
        { 'paymentInfo.stripePaymentIntentId': paymentIntentId }
      ]
    });

    if (existingBooking) {
      console.log('\n⚠️  Booking already exists:', existingBooking._id);
      console.log('Skipping creation.');
      return;
    }

    // Fetch tour package details
    console.log('\n🔍 Fetching tour package details...');
    const tourPackage = await Tour.findById(packageId);
    
    if (!tourPackage) {
      console.error('❌ Tour package not found:', packageId);
      return;
    }

    console.log('✅ Found tour package:', tourPackage.title);

    // Calculate pricing
    const bankCharge = Math.round(amount * 0.028 * 100) / 100; // 2.8% Stripe fee
    const subtotal = amount - bankCharge;

    console.log('\n💰 Pricing:');
    console.log('- Subtotal: MYR', subtotal.toFixed(2));
    console.log('- Bank Charge: MYR', bankCharge.toFixed(2));
    console.log('- Total: MYR', amount.toFixed(2));

    // Note: We don't have phone/whatsapp from Stripe metadata
    // These should be collected before payment in the future
    const phoneNumber = 'N/A'; // Not provided in Stripe metadata
    const pickupLocation = tourPackage.pickupPoints?.[0] || 'Not specified';

    console.log('\n⚠️  Warning: Phone number not available from Stripe metadata.');
    console.log('Using "N/A" as placeholder. Please update manually if customer contacts you.\n');

    // Create the booking
    console.log('📝 Creating booking...\n');
    
    const bookingData = {
      packageType: 'tour',
      packageId: new mongoose.Types.ObjectId(packageId),
      date: bookingDate,
      time: bookingTime,
      adults: adults,
      children: children,
      pickupLocation: pickupLocation,
      status: 'confirmed', // Payment already succeeded
      firstBookingMinimum: false,
      contactInfo: {
        name: customerName,
        email: customerEmail,
        phone: phoneNumber,
        whatsapp: phoneNumber
      },
      paymentInfo: {
        paymentIntentId: paymentIntentId,
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: 'succeeded',
        amount: amount,
        bankCharge: bankCharge,
        currency: 'MYR',
        paymentMethod: 'stripe',
        updatedAt: new Date('2025-12-24T15:30:05.000Z') // Payment success time
      },
      subtotal: subtotal,
      total: amount,
      isAdminBooking: false,
      isVehicleBooking: false,
      reviewEmailSent: false,
      createdAt: new Date('2025-12-24T15:30:05.000Z'), // Match payment time
      updatedAt: new Date()
    };

    const booking = new Booking(bookingData);
    const savedBooking = await booking.save();

    console.log('✅ Booking created successfully!');
    console.log('Booking ID:', savedBooking._id);
    console.log('\n📧 IMPORTANT: Send confirmation email to:', customerEmail);
    console.log('📞 IMPORTANT: Contact customer for phone number and confirm booking details');
    console.log('\n🎫 Booking Summary:');
    console.log('- Tour:', tourPackage.title);
    console.log('- Date:', bookingDate.toISOString().split('T')[0]);
    console.log('- Time:', bookingTime);
    console.log('- Guests:', adults, 'adults,', children, 'children');
    console.log('- Status: CONFIRMED');
    console.log('- Payment: COMPLETED (MYR', amount, ')');

  } catch (error) {
    console.error('❌ Error creating booking:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createMissingBooking();
