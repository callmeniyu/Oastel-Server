// List TimeSlot entries for a given date and optionally a specific time
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}
const mongoose = require('mongoose');

const DATE = process.argv[2] || '2025-09-17'; // YYYY-MM-DD
const TIME = process.argv[3] || '08:00'; // optional, pass 'all' to list all times

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Set it in .env or pass as env var.');
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

    const timeslots = await db.collection('timeslots').find({ date: DATE }).toArray();
    if (!timeslots || timeslots.length === 0) {
      console.log(`No timeslots found for date ${DATE}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    for (const ts of timeslots) {
      // Try to fetch package title
      let title = '(unknown)';
      try {
        const coll = ts.packageType === 'tour' ? 'tours' : 'transfers';
        const pkg = await db.collection(coll).findOne({ _id: ts.packageId });
        if (pkg) title = pkg.title || pkg.name || pkg.slug || String(pkg._id);
      } catch (e) {
        // ignore
      }

      const matchingSlots = TIME === 'all' ? ts.slots : ts.slots.filter(s => s.time === TIME);
      if (matchingSlots.length === 0) continue;

      console.log('--------------------------------------------------');
      console.log(`PackageType: ${ts.packageType}  PackageId: ${ts.packageId}`);
      console.log(`Package title: ${title}`);
      console.log(`Date: ${ts.date}`);
      console.log('Slots:');
      for (const s of matchingSlots) {
        console.log(`  - Time: ${s.time} | Capacity: ${s.capacity} | BookedCount: ${s.bookedCount} | MinimumPerson: ${s.minimumPerson} | isAvailable: ${s.isAvailable}`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing timeslots:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
