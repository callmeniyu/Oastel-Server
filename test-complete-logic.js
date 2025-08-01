const mongoose = require('mongoose');
const { TimeSlotService } = require('./dist/services/timeSlot.service.js');
const { Types } = require('mongoose');

// Mock tour data (similar to your data.ts file)
const mockTours = [
    {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        title: "Full Day Land Rover Road Trip",
        slug: "full-day-land-rover-road-trip", 
        type: "co-tour", // Non-private
        minimumPerson: 2,
        departureTimes: ["8:00 AM", "1:30 PM", "5:00 PM"]
    },
    {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        title: "Private Half Day Tour",
        slug: "private-half-day-tour",
        type: "private", // Private
        minimumPerson: 1,
        departureTimes: ["9:00 AM", "11:30 AM"]
    }
];

async function testTimeSlotLogic() {
    try {
        console.log('🧪 Testing Time Slot Logic - 10Hr Cutoff & Minimum Person Requirements\n');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/oastel', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB\n');

        // Test 1: 10-Hour Cutoff Rule Test
        console.log('=== Test 1: 10-Hour Cutoff Rule ===');
        
        const currentMalaysiaTime = TimeSlotService.getMalaysiaDateTime();
        console.log(`Current Malaysia Time: ${currentMalaysiaTime.fullDateTime.toLocaleString('en-MY', {timeZone: 'Asia/Kuala_Lumpur'})}`);
        
        // Test booking for tomorrow 8:00 AM (should be allowed until 10:00 PM today)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        console.log(`Testing booking for: ${tomorrowStr} at 8:00 AM`);
        
        const cutoffTest = await TimeSlotService.checkAvailability(
            'tour',
            mockTours[0]._id,
            tomorrowStr,
            '8:00 AM',
            2
        );
        
        console.log(`Cutoff Test Result:`, cutoffTest);
        console.log();

        // Test 2: Minimum Person Logic Test
        console.log('=== Test 2: Minimum Person Logic for Co-Tour ===');
        
        // Generate time slots for the co-tour first
        await TimeSlotService.generateSlotsForPackage(
            'tour',
            mockTours[0]._id,
            mockTours[0].departureTimes,
            32, // capacity
            mockTours[0].minimumPerson
        );
        
        // Check initial availability (should require 2 people minimum)
        console.log('2.1: Testing initial availability (should require minimum 2 people)');
        const initialAvailability1Person = await TimeSlotService.checkAvailability(
            'tour',
            mockTours[0]._id,
            tomorrowStr,
            '8:00 AM',
            1 // Requesting 1 person
        );
        console.log('Result for 1 person (should be denied):', initialAvailability1Person);
        
        const initialAvailability2Person = await TimeSlotService.checkAvailability(
            'tour',
            mockTours[0]._id,
            tomorrowStr,
            '8:00 AM',
            2 // Requesting 2 people
        );
        console.log('Result for 2 people (should be allowed):', initialAvailability2Person);
        
        // Get available slots to see current minimum
        console.log('\n2.2: Checking available slots before first booking');
        const slotsBeforeBooking = await TimeSlotService.getAvailableSlots(
            'tour',
            mockTours[0]._id,
            tomorrowStr
        );
        const slot8AM = slotsBeforeBooking?.find(s => s.time === '8:00 AM');
        console.log('8:00 AM slot before booking:', {
            time: slot8AM?.time,
            bookedCount: slot8AM?.bookedCount,
            minimumPerson: slot8AM?.minimumPerson,
            currentMinimum: slot8AM?.currentMinimum
        });
        
        // Make the first booking (2 people)
        console.log('\n2.3: Making first booking (2 people)');
        await TimeSlotService.updateSlotBooking(
            'tour',
            mockTours[0]._id,
            tomorrowStr,
            '8:00 AM',
            2,
            'add'
        );
        
        // Check slots after first booking
        console.log('\n2.4: Checking available slots after first booking');
        const slotsAfterBooking = await TimeSlotService.getAvailableSlots(
            'tour',
            mockTours[0]._id,
            tomorrowStr
        );
        const slot8AMAfter = slotsAfterBooking?.find(s => s.time === '8:00 AM');
        console.log('8:00 AM slot after booking:', {
            time: slot8AMAfter?.time,
            bookedCount: slot8AMAfter?.bookedCount,
            minimumPerson: slot8AMAfter?.minimumPerson,
            currentMinimum: slot8AMAfter?.currentMinimum
        });
        
        // Test booking 1 person after first booking (should now be allowed)
        console.log('\n2.5: Testing availability after first booking (1 person should now be allowed)');
        const afterBookingAvailability = await TimeSlotService.checkAvailability(
            'tour',
            mockTours[0]._id,
            tomorrowStr,
            '8:00 AM',
            1 // Requesting 1 person
        );
        console.log('Result for 1 person after first booking:', afterBookingAvailability);
        
        // Test 3: Private Tour (Minimum should never change)
        console.log('\n=== Test 3: Private Tour Logic ===');
        
        // Generate time slots for private tour
        await TimeSlotService.generateSlotsForPackage(
            'tour',
            mockTours[1]._id,
            mockTours[1].departureTimes,
            8, // capacity
            mockTours[1].minimumPerson
        );
        
        // Make a booking for private tour
        await TimeSlotService.updateSlotBooking(
            'tour',
            mockTours[1]._id,
            tomorrowStr,
            '9:00 AM',
            1,
            'add'
        );
        
        // Check private tour slots (minimum should remain unchanged)
        const privateTourSlots = await TimeSlotService.getAvailableSlots(
            'tour',
            mockTours[1]._id,
            tomorrowStr
        );
        const privateSlot9AM = privateTourSlots?.find(s => s.time === '9:00 AM');
        console.log('Private tour 9:00 AM slot after booking:', {
            time: privateSlot9AM?.time,
            bookedCount: privateSlot9AM?.bookedCount,
            minimumPerson: privateSlot9AM?.minimumPerson,
            currentMinimum: privateSlot9AM?.currentMinimum
        });

        console.log('\n🎉 All tests completed!');
        console.log('\n📋 Summary:');
        console.log('1. 10-hour cutoff rule: Check the log output above');
        console.log('2. Co-tour minimum person logic: Should change from 2 to 1 after first booking');
        console.log('3. Private tour minimum person logic: Should remain unchanged at 1');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the tests
testTimeSlotLogic();
