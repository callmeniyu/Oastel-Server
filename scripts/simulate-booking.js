// simulate-booking.js
// Usage:
//   node simulate-booking.js <slug> <date> <time> [adults] [children]
// date can be in YYYY-MM-DD or DD/MM/YYYY

const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}

const mongoose = require('mongoose');

async function parseDateInput(input) {
  // Accept YYYY-MM-DD or DD/MM/YYYY
  if (!input) return null;
  if (input.includes('/')) {
    const [d, m, y] = input.split('/').map(s => s.padStart(2, '0'));
    return `${y}-${m}-${d}`; // convert to YYYY-MM-DD
  }
  return input; // assume already YYYY-MM-DD
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node simulate-booking.js <slug> <date> <time> [adults] [children]');
    process.exit(1);
  }

  const SLUG = args[0];
  const RAW_DATE = args[1];
  const TIME = args[2];
  const ADULTS = parseInt(args[3] || '1', 10);
  const CHILDREN = parseInt(args[4] || '0', 10);

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment (.env) or server/.env');
    process.exit(1);
  }

  const DATE = await parseDateInput(RAW_DATE);

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 30000,
    });

    const db = mongoose.connection.db;

    // Find package in tours first
    let pkg = await db.collection('tours').findOne({ slug: SLUG });
    let packageType = 'tour';
    if (!pkg) {
      pkg = await db.collection('transfers').findOne({ slug: SLUG });
      packageType = 'transfer';
    }

    if (!pkg) {
      console.error('Package not found for slug:', SLUG);
      await mongoose.disconnect();
      process.exit(2);
    }

    console.log('Found package:', pkg.title || pkg.name || pkg.slug, 'type:', packageType, 'id:', pkg._id);

    // Normalize date to Malaysia timezone using compiled TimeSlotService if available
    let TimeSlotService;
    try {
      TimeSlotService = require('../dist/services/timeSlot.service').TimeSlotService;
    } catch (e) {
      try {
        // fallback to compiled JS path alternative
        TimeSlotService = require('./dist/services/timeSlot.service').TimeSlotService;
      } catch (err) {
        console.error('Could not load compiled TimeSlotService from dist. Please run `npm run build` in server/');
        console.error('Error:', err.message || err);
        await mongoose.disconnect();
        process.exit(1);
      }
    }

    const normalizedDate = TimeSlotService.formatDateToMalaysiaTimezone(DATE);

    const totalGuests = ADULTS + CHILDREN;
    const personsForUpdate = (pkg.type === 'private' || pkg.type === 'Private') ? 1 : totalGuests;

    // Insert booking into bookings collection with succeeded payment
    const bookingDoc = {
      packageType,
      packageId: pkg._id,
      date: normalizedDate,
      time: TIME,
      adults: ADULTS,
      children: CHILDREN,
      pickupLocation: '',
      contactInfo: { name: 'Simulated Test', email: 'test@example.com', phone: '' },
      status: 'confirmed',
      isVehicleBooking: pkg.type === 'private' || pkg.type === 'Private',
      paymentInfo: {
        paymentIntentId: `simulated_${Date.now()}`,
        amount: 0,
        currency: 'MYR',
        paymentStatus: 'succeeded',
        paymentMethod: 'simulated'
      },
      subtotal: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await db.collection('bookings').insertOne(bookingDoc);
    console.log('Inserted booking id:', insertResult.insertedId);

    // Update timeslot using TimeSlotService to ensure same logic as production
    try {
      console.log(`Calling TimeSlotService.updateSlotBooking(${packageType}, ${pkg._id}, ${normalizedDate}, ${TIME}, ${personsForUpdate}, 'add')`);
      await TimeSlotService.updateSlotBooking(packageType, pkg._id, normalizedDate, TIME, personsForUpdate, 'add');
      console.log('TimeSlotService.updateSlotBooking completed');
    } catch (slotErr) {
      console.error('Failed to update timeslot via TimeSlotService:', slotErr);
      // Continue to attempt package increment
    }

    // Increment package bookedCount
    try {
      const coll = packageType === 'tour' ? 'tours' : 'transfers';
      const incResult = await db.collection(coll).updateOne({ _id: pkg._id }, { $inc: { bookedCount: personsForUpdate } });
      console.log('Updated package bookedCount, matched:', incResult.matchedCount, 'modified:', incResult.modifiedCount);
    } catch (pkgErr) {
      console.error('Failed to increment package bookedCount:', pkgErr);
    }

    // Fetch and print timeslot for the date and time
    const timeslot = await db.collection('timeslots').findOne({ packageType, packageId: pkg._id, date: normalizedDate });
    if (!timeslot) {
      console.log('No timeslot document found for package on date:', normalizedDate);
    } else {
      const slot = timeslot.slots.find(s => s.time === TIME);
      if (!slot) {
        console.log('No slot matching time found. Available slots for date:');
        console.log(JSON.stringify(timeslot, null, 2));
      } else {
        console.log('Updated timeslot slot:');
        console.log(`  Time: ${slot.time}`);
        console.log(`  Capacity: ${slot.capacity}`);
        console.log(`  BookedCount: ${slot.bookedCount}`);
        console.log(`  MinimumPerson: ${slot.minimumPerson}`);
        console.log(`  isAvailable: ${slot.isAvailable}`);
      }
    }

    console.log('\nSimulation complete. Remember to clean up the simulated booking(s) if needed.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error running simulate-booking:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
