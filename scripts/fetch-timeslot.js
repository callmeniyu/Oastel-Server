// Standalone script to fetch TimeSlot data by package slug and date
// Edit the SLUG and DATE variables below, then run with: node fetch-timeslot.js

const dotenv = require('dotenv');
const path = require('path');

// Load .env from CWD first, then server/.env as a fallback
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// === EDIT THESE VALUES ===
const SLUG = 'mossy-forest-highland-discovery';
const DATE = '2025-09-16'; // YYYY-MM-DD
// ==========================

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment (.env) or server/.env');
    console.log('Options:');
    console.log(`  1) Create a .env file in the project root or in server/ with MONGO_URI=...`);
    console.log('  2) Run inline (bash):');
    console.log("       MONGO_URI='your_mongo_uri' node server/scripts/fetch-timeslot.js");
    console.log('  3) Export then run (bash):');
    console.log("       export MONGO_URI='your_mongo_uri' && node server/scripts/fetch-timeslot.js");
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

    // Find tour by slug in the native collection
    const tour = await db.collection('tours').findOne({ slug: SLUG });
    if (!tour) {
      console.error('Package not found for slug:', SLUG);
      await mongoose.disconnect();
      process.exit(2);
    }

    console.log('📦 Package Details:');
    console.log('   Title:', tour.title);
    console.log('   MinimumPerson:', tour.minimumPerson);
    console.log('   Type:', tour.type);
    console.log('   MaximumPerson:', tour.maximumPerson);
    console.log('');

    // Determine a safe ObjectId for packageId (tour._id may already be an ObjectId or a string)
    let packageId;
    try {
      packageId = mongoose.Types.ObjectId(tour._id);
    } catch (e) {
      // fallback to using the raw value
      packageId = tour._id;
    }

    // Query timeslots collection for matching packageId and date
    const timeslots = await db
      .collection('timeslots')
      .find({ packageType: 'tour', packageId: packageId, date: DATE })
      .toArray();

    if (!timeslots || timeslots.length === 0) {
      console.log(`No timeslots found for ${SLUG} on ${DATE}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(JSON.stringify(timeslots, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error fetching timeslots:', err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

run();
