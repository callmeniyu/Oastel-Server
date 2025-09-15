// Test script to manually call updateSlotBooking to check if minimumPerson logic works
const dotenv = require('dotenv');
const path = require('path');

// Load .env from CWD first, then server/.env as a fallback
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}
const mongoose = require('mongoose');

// === EDIT THESE VALUES ===
const SLUG = 'mossy-forest-highland-discovery';
const DATE = '2025-09-16'; // YYYY-MM-DD
const TIME = '08:15'; // Time slot to test
const PERSONS = 2; // Number of persons to add/subtract
const OPERATION = 'add'; // 'add' or 'subtract'
// ==========================

async function testUpdateSlotBooking() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment (.env) or server/.env');
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

    // Find tour by slug
    const tour = await db.collection('tours').findOne({ slug: SLUG });
    if (!tour) {
      console.error('Package not found for slug:', SLUG);
      await mongoose.disconnect();
      process.exit(2);
    }

    console.log(`Found tour: ${tour.title} (ID: ${tour._id})`);

    // Import the TimeSlotService from the compiled JS dist folder
    const { TimeSlotService } = require('../dist/services/timeSlot.service');

    console.log(`\n📋 BEFORE calling updateSlotBooking:`);
    
    // First, check current state
    const timeSlotBefore = await db.collection('timeslots').findOne({
      packageType: 'tour',
      packageId: tour._id,
      date: DATE
    });

    if (timeSlotBefore) {
      const slot = timeSlotBefore.slots.find(s => s.time === TIME);
      if (slot) {
        console.log(`   Time: ${TIME}, BookedCount: ${slot.bookedCount}, MinimumPerson: ${slot.minimumPerson}`);
      }
    }

    // Call updateSlotBooking
    console.log(`\n🔄 Calling updateSlotBooking(${OPERATION}, ${PERSONS} persons)...`);
    const result = await TimeSlotService.updateSlotBooking(
      'tour',
      tour._id,
      DATE,
      TIME,
      PERSONS,
      OPERATION
    );

    console.log(`\n✅ updateSlotBooking result: ${result}`);

    // Check state after
    const timeSlotAfter = await db.collection('timeslots').findOne({
      packageType: 'tour',
      packageId: tour._id,
      date: DATE
    });

    if (timeSlotAfter) {
      const slot = timeSlotAfter.slots.find(s => s.time === TIME);
      if (slot) {
        console.log(`\n📋 AFTER calling updateSlotBooking:`);
        console.log(`   Time: ${TIME}, BookedCount: ${slot.bookedCount}, MinimumPerson: ${slot.minimumPerson}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n🏁 Test completed');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testUpdateSlotBooking();