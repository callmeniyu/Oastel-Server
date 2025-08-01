/**
 * ROBUST MIGRATION SCRIPT - Fix minimumPerson values in TimeSlots
 * 
 * This script will:
 * 1. Find all tours and transfers with their minimumPerson values
 * 2. Update all TimeSlots to have correct minimumPerson values based on:
 *    - If slot has no bookings (bookedCount === 0): set to package's minimumPerson
 *    - If slot has bookings and is non-private: set to 1  
 *    - If slot has bookings and is private: keep package's minimumPerson
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oastel_db';

console.log('🚀 Starting ROBUST TimeSlot minimumPerson migration...\n');

// Define schemas (simplified for migration)
const TourSchema = new mongoose.Schema({
  minimumPerson: Number,
  type: String
});

const TransferSchema = new mongoose.Schema({
  minimumPerson: Number,
  type: String
});

const TimeSlotSchema = new mongoose.Schema({
  packageType: String,
  packageId: mongoose.Schema.Types.ObjectId,
  date: String,
  slots: [{
    time: String,
    capacity: Number,
    bookedCount: Number,
    isAvailable: Boolean,
    minimumPerson: Number,
    cutoffTime: Date,
    price: Number
  }],
  isAvailable: Boolean,
  booked: Number,
  capacity: Number,
  blackoutDate: Boolean,
  cutoffHours: Number
});

// Models
const Tour = mongoose.model('Tour', TourSchema);
const Transfer = mongoose.model('Transfer', TransferSchema);
const TimeSlot = mongoose.model('TimeSlot', TimeSlotSchema);

async function main() {
  try {
    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected successfully!\n');

    // Get stats before migration
    const beforeStats = await getStats();
    console.log('📊 BEFORE MIGRATION:');
    console.log(`   Total TimeSlots: ${beforeStats.totalTimeSlots}`);
    console.log(`   Total Slots: ${beforeStats.totalSlots}`);
    console.log(`   Slots with minimumPerson=1: ${beforeStats.slotsWithMin1}`);
    console.log(`   Slots with bookedCount=0: ${beforeStats.slotsWithZeroBookings}\n`);

    // Run migration
    const migrationResults = await runMigration();

    // Get stats after migration
    const afterStats = await getStats();
    console.log('\n📊 AFTER MIGRATION:');
    console.log(`   Total TimeSlots: ${afterStats.totalTimeSlots}`);
    console.log(`   Total Slots: ${afterStats.totalSlots}`);
    console.log(`   Slots with minimumPerson=1: ${afterStats.slotsWithMin1}`);
    console.log(`   Slots with bookedCount=0: ${afterStats.slotsWithZeroBookings}\n`);

    // Summary
    console.log('🎉 MIGRATION SUMMARY:');
    console.log(`   Tours processed: ${migrationResults.toursProcessed}`);
    console.log(`   Transfers processed: ${migrationResults.transfersProcessed}`);
    console.log(`   TimeSlots updated: ${migrationResults.timeSlotsUpdated}`);
    console.log(`   Individual slots fixed: ${migrationResults.slotUpdates}`);
    console.log(`   Errors encountered: ${migrationResults.errors.length}\n`);

    if (migrationResults.errors.length > 0) {
      console.log('❌ ERRORS:');
      migrationResults.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function runMigration() {
  const results = {
    toursProcessed: 0,
    transfersProcessed: 0,
    timeSlotsUpdated: 0,
    slotUpdates: 0,
    errors: []
  };

  try {
    // Process all tours
    console.log('🎯 Processing Tours...');
    const tours = await Tour.find().select('_id minimumPerson type');
    console.log(`   Found ${tours.length} tours`);

    for (const tour of tours) {
      try {
        const updateResults = await processPackage('tour', tour);
        results.toursProcessed++;
        results.timeSlotsUpdated += updateResults.timeSlotsUpdated;
        results.slotUpdates += updateResults.slotUpdates;
      } catch (error) {
        results.errors.push(`Tour ${tour._id}: ${error.message}`);
      }
    }

    // Process all transfers
    console.log('\n🚐 Processing Transfers...');
    const transfers = await Transfer.find().select('_id minimumPerson type');
    console.log(`   Found ${transfers.length} transfers`);

    for (const transfer of transfers) {
      try {
        const updateResults = await processPackage('transfer', transfer);
        results.transfersProcessed++;
        results.timeSlotsUpdated += updateResults.timeSlotsUpdated;
        results.slotUpdates += updateResults.slotUpdates;
      } catch (error) {
        results.errors.push(`Transfer ${transfer._id}: ${error.message}`);
      }
    }

    return results;

  } catch (error) {
    results.errors.push(`Migration error: ${error.message}`);
    return results;
  }
}

async function processPackage(packageType, packageDoc) {
  const packageId = packageDoc._id;
  const packageMinimumPerson = packageDoc.minimumPerson || 1;
  const isPrivate = packageDoc.type === 'private' || packageDoc.type === 'Private';

  console.log(`   📦 Processing ${packageType} ${packageId}: minimumPerson=${packageMinimumPerson}, isPrivate=${isPrivate}`);

  // Get all future time slots for this package
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const timeSlots = await TimeSlot.find({
    packageType,
    packageId,
    date: { $gte: todayStr }
  });

  let timeSlotsUpdated = 0;
  let slotUpdates = 0;

  for (const timeSlot of timeSlots) {
    let hasUpdates = false;

    // Process each slot within the time slot
    timeSlot.slots = timeSlot.slots.map(slot => {
      const oldMinimumPerson = slot.minimumPerson;
      let newMinimumPerson = oldMinimumPerson;

      // ROBUST LOGIC:
      if (slot.bookedCount === 0) {
        // No bookings - should use package's minimumPerson
        newMinimumPerson = packageMinimumPerson;
      } else {
        // Has bookings
        if (isPrivate) {
          // Private package with bookings - should use package's minimumPerson
          newMinimumPerson = packageMinimumPerson;
        } else {
          // Non-private package with bookings - should be 1
          newMinimumPerson = 1;
        }
      }

      // Update if different
      if (newMinimumPerson !== oldMinimumPerson) {
        console.log(`     🔧 ${timeSlot.date} ${slot.time}: ${oldMinimumPerson} → ${newMinimumPerson} (bookedCount=${slot.bookedCount})`);
        hasUpdates = true;
        slotUpdates++;
        
        return {
          ...slot,
          minimumPerson: newMinimumPerson
        };
      }

      return slot;
    });

    // Save if updated
    if (hasUpdates) {
      await timeSlot.save();
      timeSlotsUpdated++;
    }
  }

  return { timeSlotsUpdated, slotUpdates };
}

async function getStats() {
  const timeSlots = await TimeSlot.find();
  
  let totalSlots = 0;
  let slotsWithMin1 = 0;
  let slotsWithZeroBookings = 0;

  timeSlots.forEach(ts => {
    ts.slots.forEach(slot => {
      totalSlots++;
      if (slot.minimumPerson === 1) slotsWithMin1++;
      if (slot.bookedCount === 0) slotsWithZeroBookings++;
    });
  });

  return {
    totalTimeSlots: timeSlots.length,
    totalSlots,
    slotsWithMin1,
    slotsWithZeroBookings
  };
}

// Run the migration
main();
