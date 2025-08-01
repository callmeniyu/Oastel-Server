const { TimeSlotService } = require('./dist/services/timeSlot.service.js');
const { Types } = require('mongoose');
const mongoose = require('mongoose');

// Test data - simulating the Full Day Land Rover Road Trip (co-tour with minimumPerson: 2)
const testData = {
    coTourPackageId: new Types.ObjectId('507f1f77bcf86cd799439011'), // Mock ID for co-tour
    privateTourPackageId: new Types.ObjectId('507f1f77bcf86cd799439012'), // Mock ID for private tour
    testDate: '2025-08-02', // Tomorrow from current date
    testTime: '8:00 AM'
};

async function runTests() {
    try {
        console.log('🧪 Testing Minimum Person Logic for Time Slots\n');
        
        // Connect to MongoDB (assuming connection details)
        await mongoose.connect('mongodb://localhost:27017/oastel-test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB\n');
        
        // Test 1: Check availability for co-tour (should require 2 persons for first booking)
        console.log('📋 Test 1: Co-tour first booking (should require minimum 2 persons)');
        const coTourAvailability1 = await TimeSlotService.checkAvailability(
            'tour',
            testData.coTourPackageId,
            testData.testDate,
            testData.testTime,
            1 // Requesting 1 person
        );
        console.log('Result for 1 person:', coTourAvailability1);
        
        const coTourAvailability2 = await TimeSlotService.checkAvailability(
            'tour',
            testData.coTourPackageId,
            testData.testDate,
            testData.testTime,
            2 // Requesting 2 persons
        );
        console.log('Result for 2 persons:', coTourAvailability2);
        
        // Test 2: Simulate booking 2 persons for co-tour
        console.log('\n📋 Test 2: Making first booking for co-tour (2 persons)');
        await TimeSlotService.updateSlotBooking(
            'tour',
            testData.coTourPackageId,
            testData.testDate,
            testData.testTime,
            2
        );
        
        // Test 3: Check availability after first booking (should now allow 1 person minimum)
        console.log('\n📋 Test 3: Co-tour after first booking (should now allow minimum 1 person)');
        const coTourAvailabilityAfter = await TimeSlotService.checkAvailability(
            'tour',
            testData.coTourPackageId,
            testData.testDate,
            testData.testTime,
            1 // Requesting 1 person
        );
        console.log('Result for 1 person after first booking:', coTourAvailabilityAfter);
        
        // Test 4: Check private tour (should always maintain original minimum)
        console.log('\n📋 Test 4: Private tour (should always maintain original minimum)');
        const privateTourAvailability = await TimeSlotService.checkAvailability(
            'tour',
            testData.privateTourPackageId,
            testData.testDate,
            testData.testTime,
            1 // Requesting 1 person
        );
        console.log('Private tour result:', privateTourAvailability);
        
        // Test 5: Get available slots to see currentMinimum values
        console.log('\n📋 Test 5: Get available slots with currentMinimum values');
        const availableSlots = await TimeSlotService.getAvailableSlots(
            'tour',
            testData.coTourPackageId,
            testData.testDate
        );
        console.log('Co-tour available slots:', JSON.stringify(availableSlots, null, 2));
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

runTests();
