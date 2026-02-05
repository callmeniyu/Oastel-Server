/**
 * Comprehensive Booking System Health Check
 * - Finds payment successful but not recorded bookings
 * - Identifies date offset issues
 * - Checks for inconsistencies
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function scanBookingSystem() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           COMPREHENSIVE BOOKING SYSTEM SCAN');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Find all bookings with successful payment but pending/cancelled status
    console.log('📊 ISSUE #1: Payment Successful but Status Not Confirmed');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const successfulPaymentButNotConfirmed = await Booking.find({
      'paymentInfo.paymentStatus': 'succeeded',
      status: { $ne: 'confirmed' }
    }).select('_id contactInfo.name contactInfo.email packageType date time status paymentInfo.paymentStatus createdAt');

    if (successfulPaymentButNotConfirmed.length > 0) {
      console.log(`⚠️  Found ${successfulPaymentButNotConfirmed.length} booking(s) with successful payment but not confirmed:\n`);
      successfulPaymentButNotConfirmed.forEach((booking, idx) => {
        console.log(`${idx + 1}. ID: ${booking._id}`);
        console.log(`   Customer: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`   Type: ${booking.packageType}`);
        console.log(`   Date: ${booking.date.toISOString()} (Malaysia: ${booking.date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })})`);
        console.log(`   Time: ${booking.time}`);
        console.log(`   Status: ${booking.status} (Should be: confirmed)`);
        console.log(`   Payment: ${booking.paymentInfo.paymentStatus}`);
        console.log(`   Created: ${booking.createdAt.toISOString()}\n`);
      });
    } else {
      console.log('✅ No issues found - All successful payments are confirmed\n');
    }

    // 2. Find bookings with date offsets (date doesn't match Malaysia timezone expectations)
    console.log('📊 ISSUE #2: Date Offset Problems');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const allBookings = await Booking.find({})
      .select('_id contactInfo.name contactInfo.email date time createdAt')
      .sort({ createdAt: -1 })
      .limit(100); // Check last 100 bookings

    let dateOffsetIssues = [];
    
    allBookings.forEach(booking => {
      const dateInMalaysia = new Date(booking.date).toLocaleString('en-US', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const dateInUTC = booking.date.toISOString().split('T')[0];
      const createdDateMalaysia = new Date(booking.createdAt).toLocaleDateString('en-US', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      // Parse Malaysia date
      const [mMonth, mDay, mYear] = dateInMalaysia.split('/');
      const malaysiaDateStr = `${mYear}-${mMonth}-${mDay}`;
      
      // Check if booking date is before creation date (suspicious)
      const bookingDateObj = new Date(malaysiaDateStr);
      const createdDateObj = new Date(createdDateMalaysia);
      
      if (bookingDateObj < createdDateObj) {
        dateOffsetIssues.push({
          id: booking._id,
          name: booking.contactInfo.name,
          email: booking.contactInfo.email,
          bookingDate: malaysiaDateStr,
          createdDate: createdDateMalaysia,
          utcDate: dateInUTC,
          time: booking.time
        });
      }
    });

    if (dateOffsetIssues.length > 0) {
      console.log(`⚠️  Found ${dateOffsetIssues.length} booking(s) with potential date offset issues:\n`);
      dateOffsetIssues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ID: ${issue.id}`);
        console.log(`   Customer: ${issue.name} (${issue.email})`);
        console.log(`   Booking Date (Malaysia): ${issue.bookingDate} ${issue.time}`);
        console.log(`   Created Date (Malaysia): ${issue.createdDate}`);
        console.log(`   ⚠️  Booking date is BEFORE creation date!\n`);
      });
    } else {
      console.log('✅ No obvious date offset issues found in last 100 bookings\n');
    }

    // 3. Find pending payments older than 1 hour (likely abandoned/stuck)
    console.log('📊 ISSUE #3: Stuck/Abandoned Pending Payments');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckPayments = await Booking.find({
      'paymentInfo.paymentStatus': 'pending',
      createdAt: { $lt: oneHourAgo }
    }).select('_id contactInfo.name contactInfo.email date time status paymentInfo.paymentStatus createdAt');

    if (stuckPayments.length > 0) {
      console.log(`⚠️  Found ${stuckPayments.length} booking(s) with stuck pending payments:\n`);
      stuckPayments.forEach((booking, idx) => {
        const hoursSinceCreated = Math.floor((Date.now() - booking.createdAt.getTime()) / (1000 * 60 * 60));
        console.log(`${idx + 1}. ID: ${booking._id}`);
        console.log(`   Customer: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`   Date: ${booking.date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}`);
        console.log(`   Time: ${booking.time}`);
        console.log(`   Created: ${hoursSinceCreated} hours ago`);
        console.log(`   Status: ${booking.status}\n`);
      });
    } else {
      console.log('✅ No stuck pending payments found\n');
    }

    // 4. Summary Statistics
    console.log('📊 SUMMARY STATISTICS');
    console.log('─────────────────────────────────────────────────────────\n');
    
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const successfulPayments = await Booking.countDocuments({ 'paymentInfo.paymentStatus': 'succeeded' });
    
    console.log(`Total Bookings: ${totalBookings}`);
    console.log(`Confirmed: ${confirmedBookings}`);
    console.log(`Pending: ${pendingBookings}`);
    console.log(`Cancelled: ${cancelledBookings}`);
    console.log(`Successful Payments: ${successfulPayments}`);
    console.log(`\nMismatch: ${successfulPayments !== confirmedBookings ? '⚠️  YES - Payment count doesn\'t match confirmed count!' : '✅ No'}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    SCAN COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

scanBookingSystem();
