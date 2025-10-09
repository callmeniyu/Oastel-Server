require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const Tour = require('../dist/models/Tour').default;

async function analyzeBookingPatterns() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the specific booking from Oct 10
    const tour = await Tour.findOne({ slug: 'half-day-mossy-forest-land-rover-trip' });
    const targetBooking = await Booking.findById('68cc6dcd5d8439430d0f5235');
    
    console.log('🎯 ANALYZING SPECIFIC BOOKING:');
    console.log('================================');
    console.log(`Booking ID: ${targetBooking._id}`);
    console.log(`Contact: ${targetBooking.contactInfo.name} (${targetBooking.contactInfo.email})`);
    console.log(`Phone: ${targetBooking.contactInfo.phone}`);
    console.log(`Payment Intent: ${targetBooking.paymentInfo.paymentIntentId}`);
    console.log(`Amount: ${targetBooking.paymentInfo.amount}`);
    console.log(`User ID: ${targetBooking.userId || 'NONE'}`);
    console.log(`Created: ${targetBooking.createdAt}`);
    console.log(`Status: ${targetBooking.status}`);
    console.log(`Payment Status: ${targetBooking.paymentInfo.paymentStatus}`);
    
    // Check for simulation patterns
    console.log('\n🔍 SIMULATION ANALYSIS:');
    console.log('=======================');
    
    // Pattern 1: Check if email exists in multiple bookings
    const sameEmailBookings = await Booking.find({
      'contactInfo.email': targetBooking.contactInfo.email
    });
    console.log(`📧 Bookings with same email (${targetBooking.contactInfo.email}): ${sameEmailBookings.length}`);
    
    // Pattern 2: Check if phone exists in multiple bookings  
    const samePhoneBookings = await Booking.find({
      'contactInfo.phone': targetBooking.contactInfo.phone
    });
    console.log(`📞 Bookings with same phone (${targetBooking.contactInfo.phone}): ${samePhoneBookings.length}`);
    
    // Pattern 3: Check bookings without user ID
    const noUserIdBookings = await Booking.countDocuments({
      userId: { $exists: false }
    }) + await Booking.countDocuments({
      userId: null
    });
    console.log(`👤 Total bookings without user ID: ${noUserIdBookings}`);
    
    // Pattern 4: Check recent bookings around same time
    const createdTime = new Date(targetBooking.createdAt);
    const timeBefore = new Date(createdTime.getTime() - 10 * 60 * 1000); // 10 minutes before
    const timeAfter = new Date(createdTime.getTime() + 10 * 60 * 1000);  // 10 minutes after
    
    const nearTimeBookings = await Booking.find({
      createdAt: { $gte: timeBefore, $lte: timeAfter },
      _id: { $ne: targetBooking._id }
    });
    console.log(`⏰ Bookings created within 10 minutes: ${nearTimeBookings.length}`);
    
    if (nearTimeBookings.length > 0) {
      nearTimeBookings.forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.contactInfo.name} - ${booking.contactInfo.email} (${booking.createdAt})`);
      });
    }
    
    // Pattern 5: Check for payment intent patterns
    const paymentIntentPattern = targetBooking.paymentInfo.paymentIntentId;
    if (paymentIntentPattern) {
      // Extract pattern (first few characters) to see if there are similar ones
      const patternPrefix = paymentIntentPattern.substring(0, 10);
      const similarPaymentIntents = await Booking.find({
        'paymentInfo.paymentIntentId': { $regex: `^${patternPrefix}` }
      });
      console.log(`💳 Bookings with similar payment intent pattern (${patternPrefix}): ${similarPaymentIntents.length}`);
    }
    
    // Pattern 6: Check this tour's booking distribution
    console.log('\n📊 TOUR BOOKING PATTERNS:');
    console.log('=========================');
    
    const tourBookings = await Booking.find({
      packageId: tour._id,
      packageType: 'tour'
    }).sort({ createdAt: -1 }).limit(20);
    
    console.log(`Recent 20 bookings for ${tour.title}:`);
    tourBookings.forEach((booking, index) => {
      const hasUserId = booking.userId ? '✅' : '❌';
      const paymentStatus = booking.paymentInfo.paymentStatus;
      const statusEmoji = paymentStatus === 'succeeded' ? '✅' : paymentStatus === 'failed' ? '❌' : '⏳';
      
      console.log(`  ${index + 1}. ${hasUserId} ${statusEmoji} ${booking.contactInfo.name} - ${booking.contactInfo.email}`);
      console.log(`     Date: ${booking.date.toDateString()} | Created: ${booking.createdAt.toDateString()}`);
      console.log(`     Payment: ${paymentStatus} | Amount: ${booking.total}`);
    });
    
    // Pattern 7: Check for bulk operations
    const bulkBookingDates = await Booking.aggregate([
      { $match: { packageId: tour._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 },
          bookings: { $push: { id: '$_id', email: '$contactInfo.email', name: '$contactInfo.name' } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n⚡ BULK BOOKING ANALYSIS (multiple bookings in same hour):');
    console.log('=========================================================');
    if (bulkBookingDates.length === 0) {
      console.log('No bulk booking patterns detected.');
    } else {
      bulkBookingDates.forEach((group) => {
        console.log(`${group.count} bookings on ${group._id.year}-${group._id.month}-${group._id.day} at hour ${group._id.hour}:`);
        group.bookings.forEach((booking) => {
          console.log(`  - ${booking.name} (${booking.email})`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

analyzeBookingPatterns();