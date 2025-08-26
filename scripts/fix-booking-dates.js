#!/usr/bin/env node
/**
 * One-off script to fix bookings stored with the wrong date (off by one day).
 * Usage (dry-run):
 *   node server/scripts/fix-booking-dates.js --packageId=<id> --date=YYYY-MM-DD
 * To apply updates add --apply
 * Ensure MONGO_URI is set in environment or in a .env file.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('../models/Booking').default || require('../models/Booking');

async function main() {
  const argv = require('minimist')(process.argv.slice(2));
  const packageId = argv.packageId || argv.p;
  const dateStr = argv.date || argv.d; // intended date, YYYY-MM-DD
  const apply = !!argv.apply;

  if (!packageId || !dateStr) {
    console.error('Usage: node server/scripts/fix-booking-dates.js --packageId=<id> --date=YYYY-MM-DD [--apply]');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Intended date start (local midnight)
  const intendedStart = new Date(dateStr + 'T00:00:00');
  const intendedEnd = new Date(intendedStart);
  intendedEnd.setDate(intendedEnd.getDate() + 1);

  // The likely wrong stored date is one day earlier
  const wrongStart = new Date(intendedStart);
  wrongStart.setDate(wrongStart.getDate() - 1);
  const wrongEnd = new Date(wrongStart);
  wrongEnd.setDate(wrongEnd.getDate() + 1);

  console.log(`Searching bookings for package ${packageId} with stored date between ${wrongStart.toISOString()} and ${wrongEnd.toISOString()}`);

  const bookings = await Booking.find({
    packageId: mongoose.Types.ObjectId(packageId),
    date: { $gte: wrongStart, $lt: wrongEnd }
  }).lean();

  if (!bookings || bookings.length === 0) {
    console.log('No candidate bookings found. Exiting.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${bookings.length} booking(s) that may be off by one day:`);
  bookings.forEach((b) => {
    console.log(`- id=${b._id} stored=${new Date(b.date).toISOString()} createdAt=${b.createdAt}`);
  });

  if (!apply) {
    console.log('\nDry-run complete. To apply fixes, re-run with --apply');
    await mongoose.disconnect();
    return;
  }

  // Apply fixes: update booking.date to intendedStart (local midnight)
  const res = await Booking.updateMany({
    packageId: mongoose.Types.ObjectId(packageId),
    date: { $gte: wrongStart, $lt: wrongEnd }
  }, {
    $set: { date: intendedStart }
  });

  console.log(`Updated ${res.modifiedCount || res.nModified || 0} booking(s)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
