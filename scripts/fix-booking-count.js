require('dotenv').config();
const mongoose = require('mongoose');
const TimeSlot = require('../dist/models/TimeSlot').default;
const Booking = require('../dist/models/Booking').default;

async function fixBookingCount() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const packageId = '68c26d0968b239abb121386e';
    const date = '2025-09-16';
    const time = '08:15';

    // Count actual bookings for this date/time
    const targetDate = new Date('2025-09-16T08:15:00.000+05:30');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      packageId: packageId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      paymentStatus: 'succeeded'
    });

    console.log(`Found ${bookings.length} bookings for ${date}`);
    
    let totalGuests = 0;
    bookings.forEach(booking => {
      totalGuests += booking.numberOfGuests;
      console.log(`Booking ${booking._id}: ${booking.numberOfGuests} guests, date: ${booking.date}`);
    });

    console.log(`Total guests: ${totalGuests}`);

    // Update the timeslot with correct count
    const timeslot = await TimeSlot.findOne({
      packageId: packageId,
      date: date
    });

    if (timeslot) {
      const slotIndex = timeslot.slots.findIndex(slot => slot.time === time);
      if (slotIndex !== -1) {
        console.log(`Current bookedCount: ${timeslot.slots[slotIndex].bookedCount}`);
        timeslot.slots[slotIndex].bookedCount = totalGuests;
        await timeslot.save();
        console.log(`Updated bookedCount to: ${totalGuests}`);
      } else {
        console.log('Time slot not found');
      }
    } else {
      console.log('Timeslot not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixBookingCount();