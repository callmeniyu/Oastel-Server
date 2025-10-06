// cleanup-test-artifacts.js
// Deletes bookings created during testing and test users/carts.
// Targets:
//  - bookings with paymentInfo.paymentIntentId starting with 'simulated_'
//  - bookings with contactInfo.email 'test@example.com'
//  - users with emails: 'test@example.com', 'testuser@example.com', 'nonexistent@example.com'
//  - carts belonging to those users

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
    await mongoose.connect(uri, { family: 4 });
    const db = mongoose.connection.db;

    // 1) Run existing simulated cleanup for paymentIntentId
    const simulated = await db.collection('bookings').find({ 'paymentInfo.paymentIntentId': { $regex: '^simulated_' } }).toArray();
    console.log('Found simulated bookings:', simulated.length);

    // Reuse TimeSlotService to revert slots where possible
    let TimeSlotService;
    try {
      TimeSlotService = require('../dist/services/timeSlot.service').TimeSlotService;
    } catch (e) {
      try { TimeSlotService = require('../src/services/timeSlot.service').TimeSlotService; } catch (e2) { TimeSlotService = null; }
    }

    for (const b of simulated) {
      try {
        const persons = b.isVehicleBooking ? 1 : ((b.adults || 0) + (b.children || 0));
        const packageType = b.packageType;
        const packageId = b.packageId;
        let dateStr = b.date;
        if (!(typeof dateStr === 'string')) dateStr = new Date(dateStr).toISOString().split('T')[0];
        if (TimeSlotService) {
          try {
            const normalized = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);
            await TimeSlotService.updateSlotBooking(packageType, packageId, normalized, b.time, persons, 'subtract');
            console.log('Reverted timeslot for booking', b._id.toString());
          } catch (e) {
            console.warn('Failed to revert timeslot for', b._id.toString(), e.message || e);
          }
        }
        // decrement package
        try {
          const coll = packageType === 'tour' ? 'tours' : 'transfers';
          await db.collection(coll).updateOne({ _id: b.packageId }, { $inc: { bookedCount: -(b.adults + (b.children || 0) || 1) } });
        } catch (e) {
          console.warn('Failed to decrement package', e.message || e);
        }
        await db.collection('bookings').deleteOne({ _id: b._id });
        console.log('Deleted simulated booking', b._id.toString());
      } catch (e) {
        console.error('Error cleaning simulated booking', b._id.toString(), e.message || e);
      }
    }

    // 2) Remove bookings by contact email
    const testEmails = ['test@example.com', 'testuser@example.com', 'nonexistent@example.com'];
    for (const email of testEmails) {
      const bookings = await db.collection('bookings').find({ 'contactInfo.email': email }).toArray();
      console.log(`Found ${bookings.length} bookings with contact email ${email}`);
      for (const b of bookings) {
        try {
          const persons = b.isVehicleBooking ? 1 : ((b.adults || 0) + (b.children || 0));
          if (TimeSlotService) {
            try {
              let dateStr = b.date;
              if (!(typeof dateStr === 'string')) dateStr = new Date(dateStr).toISOString().split('T')[0];
              const normalized = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);
              await TimeSlotService.updateSlotBooking(b.packageType, b.packageId, normalized, b.time, persons, 'subtract');
              console.log('Reverted timeslot for booking', b._id.toString());
            } catch (e) {
              console.warn('Failed to revert timeslot for', b._id.toString(), e.message || e);
            }
          }
          // decrement package
          try {
            const coll = b.packageType === 'tour' ? 'tours' : 'transfers';
            await db.collection(coll).updateOne({ _id: b.packageId }, { $inc: { bookedCount: -persons } });
          } catch (e) {
            console.warn('Failed to decrement package', e.message || e);
          }
          await db.collection('bookings').deleteOne({ _id: b._id });
          console.log('Deleted booking by email', b._id.toString());
        } catch (e) {
          console.error('Error deleting booking', b._id.toString(), e.message || e);
        }
      }
    }

    // 3) Remove test users and their carts
    for (const email of testEmails) {
      const user = await db.collection('users').findOne({ email });
      if (user) {
        try {
          const userId = user._id;
          // delete carts referencing userId
          const cartDel = await db.collection('carts').deleteMany({ userId });
          console.log(`Deleted ${cartDel.deletedCount} carts for user ${email}`);
          // delete user
          await db.collection('users').deleteOne({ _id: userId });
          console.log('Deleted user', email);
        } catch (e) {
          console.error('Failed to delete user', email, e.message || e);
        }
      } else {
        console.log('No user found with email', email);
      }
    }

    console.log('Test artifacts cleanup finished.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error running cleanup-test-artifacts:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
