// cleanup-simulated-bookings.js
// Finds bookings created by the simulate script (paymentIntentId starts with 'simulated_')
// For each booking: subtract its persons from timeslot via TimeSlotService.updateSlotBooking,
// decrement package.bookedCount accordingly, then delete the booking document.

const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}

const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 30000,
    });

    const db = mongoose.connection.db;

    const simulatedBookings = await db.collection('bookings').find({ 'paymentInfo.paymentIntentId': { $regex: '^simulated_' } }).toArray();

    if (!simulatedBookings || simulatedBookings.length === 0) {
      console.log('No simulated bookings found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Found ${simulatedBookings.length} simulated booking(s).`);

    // Load TimeSlotService from compiled dist (prefer) or source
    let TimeSlotService;
    try {
      TimeSlotService = require('../dist/services/timeSlot.service').TimeSlotService;
    } catch (e) {
      TimeSlotService = require('../src/services/timeSlot.service').TimeSlotService;
    }

    for (const b of simulatedBookings) {
      try {
        const persons = b.isVehicleBooking ? 1 : ((b.adults || 0) + (b.children || 0));
        const packageType = b.packageType;
        const packageId = b.packageId;
        let dateStr = b.date;
        if (!(typeof dateStr === 'string')) {
          // If stored as Date, convert
          dateStr = new Date(dateStr).toISOString().split('T')[0];
        }
        dateStr = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);

        console.log(`Reverting booking ${b._id} -> subtract ${persons} from ${packageType}/${packageId} ${dateStr} ${b.time}`);
        try {
          await TimeSlotService.updateSlotBooking(packageType, packageId, dateStr, b.time, persons, 'subtract');
          console.log('  Slot updated (subtract)');
        } catch (slotErr) {
          console.warn('  Failed to update timeslot for booking:', slotErr.message || slotErr);
        }

        // Decrement package bookedCount
        try {
          const coll = packageType === 'tour' ? 'tours' : 'transfers';
          await db.collection(coll).updateOne({ _id: packageId }, { $inc: { bookedCount: -persons } });
          console.log('  Package bookedCount decremented by', persons);
        } catch (pkgErr) {
          console.warn('  Failed to decrement package bookedCount:', pkgErr.message || pkgErr);
        }

        // Delete booking
        await db.collection('bookings').deleteOne({ _id: b._id });
        console.log('  Booking deleted:', b._id);
      } catch (err) {
        console.error('Error processing simulated booking', b._id, err);
      }
    }

    console.log('Cleanup complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error in cleanup script:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
