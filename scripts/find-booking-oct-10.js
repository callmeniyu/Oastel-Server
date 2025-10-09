require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const Tour = require('../dist/models/Tour').default;

async function findSpecificBookings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // First, find the tour with the specified slug
    const tour = await Tour.findOne({ slug: 'half-day-mossy-forest-land-rover-trip' });
    
    if (!tour) {
      console.log('❌ No tour found with slug: half-day-mossy-forest-land-rover-trip');
      return;
    }
    
    console.log('✅ Found tour:');
    console.log(`  Title: ${tour.title}`);
    console.log(`  Slug: ${tour.slug}`);
    console.log(`  Tour ID: ${tour._id}`);
    console.log(`  Type: ${tour.type}`);
    console.log(`  Status: ${tour.status}`);
    console.log('---');

    // Create date range for 2025-10-10 (full day)
    const targetDate = new Date('2025-10-10');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`🔍 Searching for bookings on ${targetDate.toDateString()}`);
    console.log(`  Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    console.log('---');

    // Find all bookings for this tour on the target date
    const bookings = await Booking.find({
      packageId: tour._id,
      packageType: 'tour',
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${bookings.length} booking(s) for this tour on 2025-10-10:`);
    
    if (bookings.length === 0) {
      console.log('❌ No bookings found for this specific date and tour.');
      
      // Let's check if there are any bookings for this tour on any date
      const anyBookings = await Booking.find({
        packageId: tour._id,
        packageType: 'tour'
      }).sort({ createdAt: -1 }).limit(5);
      
      console.log(`\n🔍 Found ${anyBookings.length} booking(s) for this tour on any date:`);
      anyBookings.forEach((booking, index) => {
        console.log(`\nBooking ${index + 1}:`);
        console.log(`  Booking ID: ${booking._id}`);
        console.log(`  Date: ${booking.date.toISOString()}`);
        console.log(`  Time: ${booking.time}`);
        console.log(`  Guests: ${booking.adults} adults, ${booking.children} children`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Payment Status: ${booking.paymentInfo.paymentStatus}`);
        console.log(`  Total: ${booking.paymentInfo.currency} ${booking.total}`);
        console.log(`  Contact: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`  Admin Booking: ${booking.isAdminBooking || false}`);
        console.log(`  Created: ${booking.createdAt}`);
      });
      
    } else {
      bookings.forEach((booking, index) => {
        console.log(`\n📋 Booking ${index + 1}:`);
        console.log(`  Booking ID: ${booking._id}`);
        console.log(`  Date: ${booking.date.toISOString()}`);
        console.log(`  Time: ${booking.time}`);
        console.log(`  Guests: ${booking.adults} adults, ${booking.children} children`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Payment Status: ${booking.paymentInfo.paymentStatus}`);
        console.log(`  Payment Intent: ${booking.paymentInfo.paymentIntentId || 'None'}`);
        console.log(`  Total: ${booking.paymentInfo.currency} ${booking.total}`);
        console.log(`  Contact: ${booking.contactInfo.name} (${booking.contactInfo.email})`);
        console.log(`  Phone: ${booking.contactInfo.phone}`);
        console.log(`  Admin Booking: ${booking.isAdminBooking || false}`);
        console.log(`  User ID: ${booking.userId || 'None'}`);
        console.log(`  Pickup: ${booking.pickupLocation}`);
        console.log(`  Created: ${booking.createdAt}`);
        console.log(`  Updated: ${booking.updatedAt}`);
        
        // Check for potential simulation indicators
        const indicators = [];
        if (!booking.userId) indicators.push('No user ID');
        if (!booking.paymentInfo.paymentIntentId) indicators.push('No payment intent');
        if (booking.isAdminBooking) indicators.push('Admin booking flag');
        if (booking.contactInfo.email.includes('test') || booking.contactInfo.email.includes('demo')) {
          indicators.push('Test email');
        }
        if (booking.contactInfo.name.toLowerCase().includes('test')) {
          indicators.push('Test name');
        }
        
        if (indicators.length > 0) {
          console.log(`  🚨 POTENTIAL SIMULATION INDICATORS: ${indicators.join(', ')}`);
        }
      });
    }

    // Also check the total count for this tour across all dates
    const totalCount = await Booking.countDocuments({
      packageId: tour._id,
      packageType: 'tour'
    });
    
    console.log(`\n📈 Total bookings for this tour (all dates): ${totalCount}`);
    
    // Check for succeeded bookings specifically
    const succeededCount = await Booking.countDocuments({
      packageId: tour._id,
      packageType: 'tour',
      'paymentInfo.paymentStatus': 'succeeded'
    });
    
    console.log(`💳 Succeeded payment bookings: ${succeededCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findSpecificBookings();