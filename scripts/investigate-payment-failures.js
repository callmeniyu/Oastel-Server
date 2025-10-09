require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;

async function investigatePaymentFailures() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('💳 INVESTIGATING PAYMENT FAILURES');
    console.log('==================================');

    // Get failed payments
    const failedPayments = await Booking.find({
      'paymentInfo.paymentStatus': 'failed'
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`❌ Found ${failedPayments.length} failed payments:`);

    if (failedPayments.length > 0) {
      failedPayments.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking._id}`);
        console.log(`   Customer: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`   Amount: ${booking.paymentInfo.currency} ${booking.paymentInfo.amount}`);
        console.log(`   Payment Intent: ${booking.paymentInfo.paymentIntentId || 'None'}`);
        console.log(`   Created: ${booking.createdAt}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Payment Status: ${booking.paymentInfo.paymentStatus}`);
        console.log(`   Payment Method: ${booking.paymentInfo.paymentMethod || 'Unknown'}`);
      });
    }

    // Get pending payments that might have timed out
    const pendingPayments = await Booking.find({
      'paymentInfo.paymentStatus': 'pending',
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // Older than 30 minutes
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\n⏳ Found ${pendingPayments.length} pending payments (older than 30 min):`);

    if (pendingPayments.length > 0) {
      pendingPayments.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking._id}`);
        console.log(`   Customer: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`   Amount: ${booking.paymentInfo.currency} ${booking.paymentInfo.amount}`);
        console.log(`   Payment Intent: ${booking.paymentInfo.paymentIntentId || 'None'}`);
        console.log(`   Created: ${booking.createdAt}`);
        console.log(`   Age: ${Math.round((Date.now() - booking.createdAt.getTime()) / (1000 * 60))} minutes`);
      });
    }

    // Get payment status distribution
    const paymentStats = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentInfo.paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentInfo.amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 PAYMENT STATUS DISTRIBUTION:');
    console.log('===============================');
    paymentStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} bookings (Total: MYR ${stat.totalAmount})`);
    });

    // Check recent payment patterns
    const recentPayments = await Booking.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ createdAt: -1 });

    const successRate = recentPayments.filter(b => b.paymentInfo.paymentStatus === 'succeeded').length;
    const failureRate = recentPayments.filter(b => b.paymentInfo.paymentStatus === 'failed').length;
    const pendingRate = recentPayments.filter(b => b.paymentInfo.paymentStatus === 'pending').length;

    console.log('\n📈 LAST 7 DAYS PAYMENT ANALYSIS:');
    console.log('================================');
    console.log(`Total bookings: ${recentPayments.length}`);
    console.log(`Succeeded: ${successRate} (${Math.round(successRate/recentPayments.length*100)}%)`);
    console.log(`Failed: ${failureRate} (${Math.round(failureRate/recentPayments.length*100)}%)`);
    console.log(`Pending: ${pendingRate} (${Math.round(pendingRate/recentPayments.length*100)}%)`);

    // Check for common failure patterns
    console.log('\n🔍 ANALYZING FAILURE PATTERNS:');
    console.log('==============================');

    // Bookings without payment intent (potential system failures)
    const noPaymentIntent = await Booking.countDocuments({
      $or: [
        { 'paymentInfo.paymentIntentId': { $exists: false } },
        { 'paymentInfo.paymentIntentId': null },
        { 'paymentInfo.paymentIntentId': '' }
      ]
    });

    console.log(`Bookings without payment intent: ${noPaymentIntent}`);

    // Check for duplicate payment attempts
    const duplicatePayments = await Booking.aggregate([
      {
        $match: {
          'paymentInfo.paymentIntentId': { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$paymentInfo.paymentIntentId',
          count: { $sum: 1 },
          bookings: { $push: { id: '$_id', email: '$contactInfo.email', status: '$paymentInfo.paymentStatus' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      { $sort: { count: -1 } }
    ]);

    console.log(`Duplicate payment intents: ${duplicatePayments.length}`);
    if (duplicatePayments.length > 0) {
      console.log('\nDuplicate payment intent examples:');
      duplicatePayments.slice(0, 3).forEach(dup => {
        console.log(`  ${dup._id}: ${dup.count} bookings`);
        dup.bookings.forEach(booking => {
          console.log(`    - ${booking.email} (${booking.status})`);
        });
      });
    }

    // Check booking creation vs payment success timing
    console.log('\n⏱️  PAYMENT TIMING ANALYSIS:');
    console.log('============================');

    const succeededBookings = await Booking.find({
      'paymentInfo.paymentStatus': 'succeeded',
      'paymentInfo.paymentIntentId': { $exists: true }
    }).sort({ createdAt: -1 }).limit(20);

    let quickPayments = 0;
    let slowPayments = 0;

    succeededBookings.forEach(booking => {
      // Estimate payment completion time (this is approximate since we don't have exact payment completion timestamp)
      const estimatedPaymentTime = booking.updatedAt.getTime() - booking.createdAt.getTime();
      const minutes = Math.round(estimatedPaymentTime / (1000 * 60));
      
      if (minutes <= 5) {
        quickPayments++;
      } else {
        slowPayments++;
      }
    });

    console.log(`Quick payments (≤5 min): ${quickPayments}`);
    console.log(`Slow payments (>5 min): ${slowPayments}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

investigatePaymentFailures();