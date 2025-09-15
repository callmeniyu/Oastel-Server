// recompute-timeslot-bookedcount.js
// Usage:
//  node recompute-timeslot-bookedcount.js <slug> <date> [time]
// If time omitted, recompute all slots for that date for the package.

const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}

const mongoose = require('mongoose');

async function parseDateInput(input) {
  if (!input) return null;
  if (input.includes('/')) {
    const [d, m, y] = input.split('/').map(s => s.padStart(2, '0'));
    return `${y}-${m}-${d}`;
  }
  return input;
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node recompute-timeslot-bookedcount.js <slug> <date> [time]');
    process.exit(1);
  }

  const SLUG = args[0];
  const RAW_DATE = args[1];
  const TIME = args[2];

  const DATE = await parseDateInput(RAW_DATE);

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

    console.log('Package:', pkg.title || pkg.slug || pkg._id, 'type:', packageType);

    // Load TimeSlotService
    let TimeSlotService;
    try {
      TimeSlotService = require('../dist/services/timeSlot.service').TimeSlotService;
    } catch (e) {
      TimeSlotService = require('../src/services/timeSlot.service').TimeSlotService;
    }

    const normalizedDate = TimeSlotService.formatDateToMalaysiaTimezone(DATE);

    // Aggregate bookings that are succeeded for this package/date (and optionally time)
    const match = {
      packageId: pkg._id,
      packageType: packageType,
      'paymentInfo.paymentStatus': 'succeeded'
    };

    // Bookings may have date stored as string or Date; we'll fetch all bookings for this package and filter in JS
    const bookings = await db.collection('bookings').find({ packageId: pkg._id, packageType: packageType, 'paymentInfo.paymentStatus': 'succeeded' }).toArray();

    // Filter by normalizedDate and optionally time
    const filtered = bookings.filter(b => {
      let bDate = b.date;
      if (!(typeof bDate === 'string')) {
        bDate = new Date(bDate).toISOString().split('T')[0];
      }
      bDate = TimeSlotService.formatDateToMalaysiaTimezone(bDate);
      if (bDate !== normalizedDate) return false;
      if (TIME && b.time !== TIME) return false;
      return true;
    });

    if (filtered.length === 0) {
      console.log('No succeeded bookings found for that package/date/time to aggregate');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Compute totals per slot time
    const totalsByTime = {};
    for (const b of filtered) {
      const t = b.time;
      const persons = b.isVehicleBooking ? 1 : ((b.adults || 0) + (b.children || 0));
      totalsByTime[t] = (totalsByTime[t] || 0) + persons;
    }

    console.log('Aggregated totals by time:', totalsByTime);

    // Update timeslot doc: set slot.bookedCount to aggregated value and update minimumPerson accordingly
    const timeslotDoc = await db.collection('timeslots').findOne({ packageId: pkg._id, packageType: packageType, date: normalizedDate });
    if (!timeslotDoc) {
      console.log('No timeslot doc found for that date.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let modified = false;
    for (let i = 0; i < timeslotDoc.slots.length; i++) {
      const s = timeslotDoc.slots[i];
      const newCount = totalsByTime[s.time] || 0;
      if (s.bookedCount !== newCount) {
        console.log(`Updating slot ${s.time}: ${s.bookedCount} -> ${newCount}`);
        timeslotDoc.slots[i].bookedCount = newCount;
        // adjust minimumPerson: if newCount > 0 and non-private, set minimumPerson to 1 else restore package.minimumPerson
        const isPrivate = pkg.type === 'private' || pkg.type === 'Private';
        if (!isPrivate) {
          timeslotDoc.slots[i].minimumPerson = newCount > 0 ? 1 : (pkg.minimumPerson || 1);
        }
        modified = true;
      }
    }

    if (modified) {
      await db.collection('timeslots').updateOne({ _id: timeslotDoc._id }, { $set: { slots: timeslotDoc.slots, updatedAt: new Date() } });
      console.log('Timeslot document updated successfully.');
    } else {
      console.log('No changes required to timeslot document.');
    }

    // Also update package.bookedCount to reflect sum of all slots for that date (or overall?)
    // Here we'll increment package.bookedCount to match total bookings for that date
    const totalForDate = Object.values(totalsByTime).reduce((a, b) => a + b, 0);
    try {
      await db.collection(packageType === 'tour' ? 'tours' : 'transfers').updateOne({ _id: pkg._id }, { $set: { bookedCount: (pkg.bookedCount || 0) } });
      console.log('Package bookedCount left unchanged (manual review advised).');
    } catch (e) {
      console.warn('Failed to update package bookedCount:', e.message || e);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error in recompute script:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
