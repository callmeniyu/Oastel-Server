// Migration script to fix minimumPerson values in existing TimeSlots
require('dotenv').config();
const mongoose = require('mongoose');
const { Types } = mongoose;

console.log('🔧 Starting TimeSlot minimumPerson migration...');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oastel_db';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    return fixTimeSlotMinimumPerson();
  })
  .catch(error => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Define models if not already in schema
const Tour = mongoose.model('Tour', new mongoose.Schema({
  minimumPerson: Number,
  type: String
}));

const Transfer = mongoose.model('Transfer', new mongoose.Schema({
  minimumPerson: Number,
  type: String
}));

const TimeSlot = mongoose.model('TimeSlot', new mongoose.Schema({
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
}));

async function fixTimeSlotMinimumPerson() {
  try {
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all tours and transfers
    const tours = await Tour.find().select('_id minimumPerson type');
    const transfers = await Transfer.find().select('_id minimumPerson type');

    console.log(`Found ${tours.length} tours and ${transfers.length} transfers`);

    // Process tours
    for (const tour of tours) {
      await processPackage('tour', tour);
    }

    // Process transfers
    for (const transfer of transfers) {
      await processPackage('transfer', transfer);
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function processPackage(packageType, packageDoc) {
  try {
    const packageId = packageDoc._id;
    const packageMinimumPerson = packageDoc.minimumPerson || 1;
    const isPrivate = packageDoc.type === 'private' || packageDoc.type === 'Private';

    console.log(`Processing ${packageType} ${packageId}, minimumPerson=${packageMinimumPerson}, isPrivate=${isPrivate}`);

    // Get all future time slots for this package
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const timeSlots = await TimeSlot.find({
      packageType,
      packageId,
      date: { $gte: todayStr }
    });

    console.log(`Found ${timeSlots.length} future time slots`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each time slot
    for (const timeSlot of timeSlots) {
      let slotUpdated = false;

      // Process each slot within the time slot
      timeSlot.slots = timeSlot.slots.map(slot => {
        // If this slot has no bookings, set minimumPerson to package default
        if (slot.bookedCount === 0) {
          // Only update if different from current value
          if (slot.minimumPerson !== packageMinimumPerson) {
            slotUpdated = true;
            console.log(`Updating slot ${timeSlot.date} ${slot.time}: minimumPerson ${slot.minimumPerson} -> ${packageMinimumPerson}`);
            return {
              ...slot,
              minimumPerson: packageMinimumPerson
            };
          }
        } 
        // If this is a non-private package with bookings, minimum should be 1
        else if (!isPrivate && slot.bookedCount > 0) {
          if (slot.minimumPerson !== 1) {
            slotUpdated = true;
            console.log(`Updating booked non-private slot ${timeSlot.date} ${slot.time}: minimumPerson ${slot.minimumPerson} -> 1`);
            return {
              ...slot,
              minimumPerson: 1
            };
          }
        }
        // No change needed
        return slot;
      });

      // Save if updated
      if (slotUpdated) {
        await timeSlot.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Package ${packageType}/${packageId}: Updated ${updatedCount} timeslots, skipped ${skippedCount} timeslots`);
  } catch (error) {
    console.error(`Error processing ${packageType} ${packageDoc._id}:`, error);
  }
}
