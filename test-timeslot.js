const mongoose = require('mongoose');
require('dotenv').config();

// Import models and services
const Transfer = require('./src/models/Transfer');
const Tour = require('./src/models/Tour');
const Vehicle = require('./src/models/Vehicle');
const TimeSlot = require('./src/models/TimeSlot');

async function testTimeSlotCapacity() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test 1: Find a private transfer
        const privateTransfer = await Transfer.findOne({ type: 'Private' }).lean();
        if (privateTransfer) {
            console.log('\n🚗 Private Transfer:', privateTransfer.title);
            console.log('   Type:', privateTransfer.type);
            console.log('   Vehicle:', privateTransfer.vehicle);
            console.log('   Maximum Person:', privateTransfer.maximumPerson);
            
            // Find its time slots
            const privateSlots = await TimeSlot.find({ 
                packageType: 'transfer', 
                packageId: privateTransfer._id 
            }).limit(3);
            
            console.log('   Time Slots:');
            privateSlots.forEach(slot => {
                console.log(`     ${slot.time}: capacity=${slot.capacity}, booked=${slot.bookedCount}, available=${slot.capacity - slot.bookedCount}`);
            });
            
            // Check if vehicle exists
            if (privateTransfer.vehicle) {
                const vehicle = await Vehicle.findOne({ name: privateTransfer.vehicle }).lean();
                if (vehicle) {
                    console.log('   Vehicle Units:', vehicle.units);
                    console.log('   Expected: slot.capacity should equal vehicle.units');
                    if (privateSlots.length > 0) {
                        console.log(`   ✅ Match: ${privateSlots[0].capacity === vehicle.units ? 'YES' : 'NO'}`);
                    }
                } else {
                    console.log('   ❌ Vehicle not found');
                }
            }
        }

        // Test 2: Find a non-private transfer
        const nonPrivateTransfer = await Transfer.findOne({ type: { $ne: 'Private' } }).lean();
        if (nonPrivateTransfer) {
            console.log('\n🚌 Non-Private Transfer:', nonPrivateTransfer.title);
            console.log('   Type:', nonPrivateTransfer.type);
            console.log('   Maximum Person:', nonPrivateTransfer.maximumPerson);
            
            // Find its time slots
            const nonPrivateSlots = await TimeSlot.find({ 
                packageType: 'transfer', 
                packageId: nonPrivateTransfer._id 
            }).limit(3);
            
            console.log('   Time Slots:');
            nonPrivateSlots.forEach(slot => {
                console.log(`     ${slot.time}: capacity=${slot.capacity}, booked=${slot.bookedCount}, available=${slot.capacity - slot.bookedCount}`);
            });
            
            console.log('   Expected: slot.capacity should equal maximumPerson');
            if (nonPrivateSlots.length > 0) {
                console.log(`   ✅ Match: ${nonPrivateSlots[0].capacity === nonPrivateTransfer.maximumPerson ? 'YES' : 'NO'}`);
            }
        }

        // Test 3: Compare with tours
        const tour = await Tour.findOne().lean();
        if (tour) {
            console.log('\n🎯 Tour (for comparison):', tour.title);
            console.log('   Maximum Person:', tour.maximumPerson);
            
            // Find its time slots
            const tourSlots = await TimeSlot.find({ 
                packageType: 'tour', 
                packageId: tour._id 
            }).limit(3);
            
            console.log('   Time Slots:');
            tourSlots.forEach(slot => {
                console.log(`     ${slot.time}: capacity=${slot.capacity}, booked=${slot.bookedCount}, available=${slot.capacity - slot.bookedCount}`);
            });
            
            console.log('   Expected: slot.capacity should equal maximumPerson');
            if (tourSlots.length > 0) {
                console.log(`   ✅ Match: ${tourSlots[0].capacity === tour.maximumPerson ? 'YES' : 'NO'}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Run the test
testTimeSlotCapacity();
