require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const User = require('../dist/models/User').default;

async function investigateUserIdIssue() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('🔍 INVESTIGATING USER ID ASSIGNMENT ISSUE');
    console.log('==========================================');

    // Check recent bookings without User IDs
    const recentBookingsNoUserId = await Booking.find({
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`📊 Recent ${recentBookingsNoUserId.length} bookings without User ID:`);
    console.log('=======================================================');

    for (let i = 0; i < recentBookingsNoUserId.length; i++) {
      const booking = recentBookingsNoUserId[i];
      console.log(`\n${i + 1}. Booking ID: ${booking._id}`);
      console.log(`   Email: ${booking.contactInfo.email}`);
      console.log(`   Name: ${booking.contactInfo.name}`);
      console.log(`   Date: ${booking.date.toDateString()}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log(`   Payment Status: ${booking.paymentInfo.paymentStatus}`);
      console.log(`   Payment Intent: ${booking.paymentInfo.paymentIntentId || 'None'}`);

      // Check if user exists with this email
      const user = await User.findOne({ email: booking.contactInfo.email });
      if (user) {
        console.log(`   ❌ USER EXISTS! ID: ${user._id} - Should have been linked`);
      } else {
        console.log(`   ⚠️  No user found with this email`);
      }
    }

    // Check recent bookings WITH User IDs for comparison
    const recentBookingsWithUserId = await Booking.find({
      userId: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`\n✅ Recent ${recentBookingsWithUserId.length} bookings WITH User ID (for comparison):`);
    console.log('================================================================');

    for (let i = 0; i < recentBookingsWithUserId.length; i++) {
      const booking = recentBookingsWithUserId[i];
      console.log(`\n${i + 1}. Booking ID: ${booking._id}`);
      console.log(`   User ID: ${booking.userId}`);
      console.log(`   Email: ${booking.contactInfo.email}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log(`   Payment Status: ${booking.paymentInfo.paymentStatus}`);
    }

    // Analyze pattern by creation date
    console.log('\n📅 TIMELINE ANALYSIS:');
    console.log('=====================');

    const dateAnalysis = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalBookings: { $sum: 1 },
          bookingsWithUserId: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$userId', null] }, { $ne: ['$userId', undefined] }] },
                1,
                0
              ]
            }
          },
          bookingsWithoutUserId: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$userId', null] }, { $eq: ['$userId', undefined] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 10 }
    ]);

    dateAnalysis.forEach(day => {
      const date = `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`;
      const percentage = Math.round((day.bookingsWithoutUserId / day.totalBookings) * 100);
      console.log(`${date}: ${day.bookingsWithoutUserId}/${day.totalBookings} (${percentage}%) without User ID`);
    });

    // Check if it's related to booking source
    console.log('\n🔄 BOOKING SOURCE ANALYSIS:');
    console.log('===========================');

    // Check if it's direct bookings vs cart bookings
    const directBookings = await Booking.find({
      $or: [{ userId: null }, { userId: { $exists: false } }],
      'paymentInfo.paymentIntentId': { $exists: true, $ne: null }
    }).countDocuments();

    const cartBookings = await Booking.find({
      userId: { $exists: true, $ne: null },
      'paymentInfo.paymentIntentId': { $exists: true, $ne: null }
    }).countDocuments();

    console.log(`Direct bookings (no User ID): ${directBookings}`);
    console.log(`Cart bookings (with User ID): ${cartBookings}`);

    // Check for failed user lookups
    console.log('\n👤 USER LOOKUP VERIFICATION:');
    console.log('============================');

    const uniqueEmails = await Booking.distinct('contactInfo.email', {
      $or: [{ userId: null }, { userId: { $exists: false } }]
    });

    console.log(`Checking ${uniqueEmails.length} unique emails from bookings without User ID...`);

    let emailsWithExistingUsers = 0;
    let emailsWithoutUsers = 0;

    for (const email of uniqueEmails.slice(0, 20)) { // Check first 20 to avoid too much output
      const user = await User.findOne({ email: email });
      if (user) {
        emailsWithExistingUsers++;
        console.log(`❌ ${email} - User exists (ID: ${user._id}) but booking not linked`);
      } else {
        emailsWithoutUsers++;
      }
    }

    console.log(`\nSUMMARY: ${emailsWithExistingUsers} emails have existing users but bookings weren't linked`);
    console.log(`         ${emailsWithoutUsers} emails don't have user accounts`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

investigateUserIdIssue();