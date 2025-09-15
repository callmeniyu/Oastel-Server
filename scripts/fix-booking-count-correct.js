require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const TimeSlot = require('../dist/models/TimeSlot').default;

async function fixBookingCountCorrect() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const packageId = '68c26d0968b239abb121386e';
    const date = '2025-09-16';
    const time = '08:15';

    // Find bookings with succeeded payment status in paymentInfo
    const bookings = await Booking.find({
      packageId: packageId,
      'paymentInfo.paymentStatus': 'succeeded'
    });

    console.log(`Found ${bookings.length} succeeded bookings for package`);
    
    // Filter for September 16, 2025
    const sept16Bookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const targetDate = new Date('2025-09-16');
      return bookingDate.toDateString() === targetDate.toDateString();
    });

    console.log(`Found ${sept16Bookings.length} bookings for Sept 16, 2025:`);
    
    let totalGuests = 0;
    sept16Bookings.forEach(booking => {
      const guests = booking.adults + booking.children;
      totalGuests += guests;
      console.log(`Booking ${booking._id}: ${guests} guests (${booking.adults} adults + ${booking.children} children), date: ${booking.date}`);
    });

    console.log(`Total guests for Sept 16: ${totalGuests}`);

    // Update the timeslot with correct count
    const timeslot = await TimeSlot.findOne({
      packageId: packageId,
      date: date
    });

    if (timeslot) {
      const slotIndex = timeslot.slots.findIndex(slot => slot.time === time);
      if (slotIndex !== -1) {
        console.log(`\nCurrent bookedCount: ${timeslot.slots[slotIndex].bookedCount}`);
        timeslot.slots[slotIndex].bookedCount = totalGuests;
        await timeslot.save();
        console.log(`Updated bookedCount to: ${totalGuests}`);
        console.log(`Available seats: ${timeslot.slots[slotIndex].capacity - totalGuests}`);
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

fixBookingCountCorrect();