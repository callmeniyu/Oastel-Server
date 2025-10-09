require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const User = require('../dist/models/User').default;

async function verifyFixes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('✅ VERIFICATION OF ALL FIXES');
    console.log('============================');

    // 1. Verify the specific booking is fixed
    const specificBooking = await Booking.findById('68cc6dcd5d8439430d0f5235');
    console.log('\n1. SPECIFIC BOOKING FIX:');
    console.log(`   Booking Status: ${specificBooking.status} ✅`);
    console.log(`   Has User ID: ${specificBooking.userId ? 'Yes ✅' : 'No ❌'}`);

    // 2. Verify all succeeded bookings have User IDs
    const succeededWithoutUserId = await Booking.countDocuments({
      'paymentInfo.paymentStatus': 'succeeded',
      $or: [{ userId: null }, { userId: { $exists: false } }]
    });
    console.log('\n2. USER ID ASSIGNMENT FIX:');
    console.log(`   Succeeded bookings without User ID: ${succeededWithoutUserId} ${succeededWithoutUserId === 0 ? '✅' : '❌'}`);

    // 3. Verify all succeeded bookings are confirmed
    const succeededNotConfirmed = await Booking.countDocuments({
      'paymentInfo.paymentStatus': 'succeeded',
      status: { $ne: 'confirmed' }
    });
    console.log('\n3. BOOKING STATUS FIX:');
    console.log(`   Succeeded bookings not confirmed: ${succeededNotConfirmed} ${succeededNotConfirmed === 0 ? '✅' : '❌'}`);

    // 4. Get overall statistics
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const succeededPayments = await Booking.countDocuments({ 'paymentInfo.paymentStatus': 'succeeded' });

    console.log('\n4. OVERALL STATISTICS:');
    console.log(`   Total bookings: ${totalBookings}`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Confirmed bookings: ${confirmedBookings}`);
    console.log(`   Succeeded payments: ${succeededPayments}`);

    // 5. Check recent booking pattern
    const recentBookingsWithUserId = await Booking.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      userId: { $exists: true, $ne: null }
    }).countDocuments();

    const recentBookingsTotal = await Booking.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    console.log('\n5. RECENT BOOKING PATTERN:');
    console.log(`   Recent bookings (24h): ${recentBookingsTotal}`);
    console.log(`   With User ID: ${recentBookingsWithUserId}`);
    console.log(`   Success rate: ${recentBookingsTotal > 0 ? Math.round((recentBookingsWithUserId/recentBookingsTotal)*100) : 0}%`);

    console.log('\n🎉 ALL FIXES VERIFICATION COMPLETE!');
    
    if (succeededWithoutUserId === 0 && succeededNotConfirmed === 0) {
      console.log('✅ All issues have been successfully resolved!');
    } else {
      console.log('❌ Some issues still need attention.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyFixes();