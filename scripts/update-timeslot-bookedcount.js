require('dotenv').config();
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load .env from CWD first, then server/.env as a fallback
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}

// === EDIT THESE VALUES ===
// Set PACKAGE_TYPE to either 'tour' or 'transfer'
const PACKAGE_TYPE = 'tour'; // 'tour' | 'transfer'
const SLUG = 'mossy-forest-full-day-highland-discovery';
const DATE = '2025-09-18';
const TIME = '08:15';
const NEW_BOOKED_COUNT = 2;
// ==========================

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment (.env) or server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { family: 4 });
    const db = mongoose.connection.db;

  const collName = PACKAGE_TYPE === 'transfer' ? 'transfers' : 'tours';
  console.log(`Searching for package slug='${SLUG}' in collection='${collName}'`);
  const tour = await db.collection(collName).findOne({ slug: SLUG });
    if (!tour) {
      console.error('Package not found for slug in', collName + ':', SLUG);
      process.exit(2);
    }

    const tsColl = db.collection('timeslots');

    // Normalize date to Malaysia timezone YYYY-MM-DD using TimeSlotService if available
    let TimeSlotService;
    try {
      TimeSlotService = require('../dist/services/timeSlot.service').TimeSlotService;
    } catch (e) {
      TimeSlotService = require('../src/services/timeSlot.service').TimeSlotService;
    }

    // Accept DD/MM/YYYY or YYYY-MM-DD
    let dateStr = DATE;
    if (DATE.includes('/')) {
      const [d, m, y] = DATE.split('/').map(s => s.padStart(2, '0'));
      dateStr = `${y}-${m}-${d}`;
    }
    dateStr = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);

    console.log(`Looking up timeslot for date='${dateStr}', packageType='${PACKAGE_TYPE}'`);

    const ts = await tsColl.findOne({ packageType: PACKAGE_TYPE, packageId: tour._id, date: dateStr });
    if (!ts) {
      console.error('TimeSlot record not found for date:', dateStr);
      process.exit(3);
    }

    // Find the specific slot and update bookedCount
    const updatedSlots = ts.slots.map(slot => {
      if (slot.time === TIME) {
        slot.bookedCount = NEW_BOOKED_COUNT;
      }
      return slot;
    });

    const updateResult = await tsColl.updateOne({ _id: ts._id }, { $set: { slots: updatedSlots } });
    console.log('Update result:', updateResult.result || updateResult);

    // Print updated doc
    const updated = await tsColl.findOne({ _id: ts._id });
    console.log(JSON.stringify(updated, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();