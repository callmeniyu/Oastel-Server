require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const Tour = require('../dist/models/Tour').default;

async function investigateAdminDiscrepancy() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const tour = await Tour.findOne({ slug: 'half-day-mossy-forest-land-rover-trip' });
    
    console.log('🎯 INVESTIGATING ADMIN PANEL DISCREPANCY');
    console.log('========================================');
    
    // Check the specific booking from Oct 10
    const specificBooking = await Booking.findById('68cc6dcd5d8439430d0f5235');
    
    console.log('📋 THE BOOKING IN QUESTION:');
    console.log(`  ID: ${specificBooking._id}`);
    console.log(`  Date: ${specificBooking.date} (${specificBooking.date.toDateString()})`);
    console.log(`  Status: ${specificBooking.status}`);
    console.log(`  Payment Status: ${specificBooking.paymentInfo.paymentStatus}`);
    console.log(`  User ID: ${specificBooking.userId || 'NONE - this is the issue!'}`);
    console.log(`  Contact: ${specificBooking.contactInfo.name} (${specificBooking.contactInfo.email})`);
    
    // Check what the admin panel might be filtering by
    console.log('\n🔍 ADMIN PANEL FILTERING ANALYSIS:');
    console.log('==================================');
    
    // Possible admin filters:
    // 1. Status = "confirmed" only
    const confirmedBookings = await Booking.find({
      packageId: tour._id,
      status: 'confirmed',
      date: { $gte: new Date('2025-10-10'), $lt: new Date('2025-10-11') }
    });
    console.log(`✅ Confirmed status bookings for Oct 10: ${confirmedBookings.length}`);
    
    // 2. Must have userId
    const userIdBookings = await Booking.find({
      packageId: tour._id,
      userId: { $exists: true, $ne: null },
      date: { $gte: new Date('2025-10-10'), $lt: new Date('2025-10-11') }
    });
    console.log(`👤 Bookings with User ID for Oct 10: ${userIdBookings.length}`);
    
    // 3. Payment status = succeeded AND status = confirmed
    const fullyValidBookings = await Booking.find({
      packageId: tour._id,
      status: 'confirmed',
      'paymentInfo.paymentStatus': 'succeeded',
      userId: { $exists: true, $ne: null },
      date: { $gte: new Date('2025-10-10'), $lt: new Date('2025-10-11') }
    });
    console.log(`✅ Fully valid bookings (confirmed + succeeded + userId) for Oct 10: ${fullyValidBookings.length}`);
    
    // 4. Check if admin counts total slots vs actual bookings
    console.log('\n📊 BOOKING COUNT ANALYSIS:');
    console.log('==========================');
    
    // Total bookings for this date
    const allBookingsOct10 = await Booking.find({
      packageId: tour._id,
      date: { $gte: new Date('2025-10-10'), $lt: new Date('2025-10-11') }
    });
    console.log(`📅 All bookings for Oct 10, 2025: ${allBookingsOct10.length}`);
    
    // Maybe admin shows 1/15 because:
    // - 1 booking exists (our found booking)
    // - 15 is the maximum capacity or available slots
    console.log(`🎫 Tour maximum persons: ${tour.maximumPerson || 'Not set'}`);
    console.log(`👥 Tour minimum persons: ${tour.minimumPerson || 'Not set'}`);
    
    // Check if it's a slot-based system
    const TimeSlot = require('../dist/models/TimeSlot').default;
    const timeSlots = await TimeSlot.find({
      tourId: tour._id,
      date: { $gte: new Date('2025-10-10'), $lt: new Date('2025-10-11') }
    });
    console.log(`⏰ Time slots for Oct 10: ${timeSlots.length}`);
    
    if (timeSlots.length > 0) {
      timeSlots.forEach(slot => {
        console.log(`  Slot: ${slot.time} - Capacity: ${slot.availableSlots}/${slot.totalSlots}`);
      });
    }
    
    console.log('\n🚨 CONCLUSION:');
    console.log('==============');
    console.log('The booking exists in the database but has these characteristics:');
    console.log('❌ No User ID (userId is null/undefined)');
    console.log('❌ Status is "pending" not "confirmed"');
    console.log('✅ Payment status is "succeeded"');
    console.log('✅ Has valid payment intent ID');
    console.log('✅ Has valid contact information');
    
    console.log('\nMost likely reasons for admin panel discrepancy:');
    console.log('1. Admin panel filters out bookings without User ID');
    console.log('2. Admin panel only shows "confirmed" status bookings');
    console.log('3. Admin panel requires both User ID AND confirmed status');
    console.log('4. The "1/15" might refer to slot occupancy rather than booking count');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Check admin panel filtering logic');
    console.log('2. Consider if bookings without User ID should be shown');
    console.log('3. Verify if booking status should auto-update to "confirmed" on payment success');
    console.log('4. Review the slot counting mechanism');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

investigateAdminDiscrepancy();