const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Simple test using the API endpoint
async function testRollingTimeslotsAPI() {
    try {
        console.log('🧪 TESTING ROLLING TIMESLOT SYSTEM VIA API');
        console.log('==========================================');
        
        const baseURL = process.env.API_BASE_URL || 'http://localhost:5000';
        const testPackageId = '68b521f827021a6fb08770cb';
        
        // Connect to MongoDB to check data directly
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Import models
        const Transfer = mongoose.model('Transfer', require('./src/models/Transfer').transferSchema);
        const TimeSlot = mongoose.model('TimeSlot', require('./src/models/TimeSlot').timeSlotSchema);
        
        // Step 1: Check the current state
        console.log('\n📋 STEP 1: Checking current state of test package');
        const transfer = await Transfer.findById(testPackageId);
        if (!transfer) {
            console.log('❌ Test transfer not found');
            return;
        }
        
        console.log(`- Transfer: ${transfer.title}`);
        console.log(`- Last slots generated: ${transfer.lastSlotsGeneratedAt || 'Never'}`);
        
        // Step 2: Check existing timeslots
        console.log('\n📅 STEP 2: Checking existing timeslots');
        const existingSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 });
        
        console.log(`- Total slot documents: ${existingSlots.length}`);
        
        if (existingSlots.length > 0) {
            const lastDate = new Date(existingSlots[existingSlots.length - 1].date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
            console.log(`- Days coverage from today: ${daysFromToday}`);
        }
        
        // Step 3: Test generation for specific package via API
        console.log('\n🔄 STEP 3: Testing generation for specific package');
        
        try {
            const response = await axios.post(`${baseURL}/api/rolling-timeslots/generate/transfer/${testPackageId}`);
            console.log(`- API Response: ${response.status}`);
            console.log(`- Result: ${response.data.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`- Message: ${response.data.message}`);
            console.log(`- Slots generated: ${response.data.slotsGenerated || 0}`);
        } catch (error) {
            console.log('⚠️ API call failed (server might not be running)');
            console.log(`- Error: ${error.message}`);
            
            // Fall back to direct service test
            console.log('\n🔄 FALLBACK: Testing service directly');
            
            // Register ts-node and import service
            require('ts-node').register();
            const { RollingTimeslotService } = require('./src/services/rollingTimeslot.service');
            
            const result = await RollingTimeslotService.generateSlotsForSpecificPackage(
                'transfer',
                testPackageId
            );
            
            console.log(`- Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`- Message: ${result.message}`);
            console.log(`- Slots generated: ${result.slotsGenerated}`);
        }
        
        // Step 4: Verify the new state
        console.log('\n✅ STEP 4: Verifying new state');
        
        const updatedTransfer = await Transfer.findById(testPackageId);
        console.log(`- Last slots generated (updated): ${updatedTransfer.lastSlotsGeneratedAt}`);
        
        const newSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 });
        
        console.log(`- Total slot documents (after): ${newSlots.length}`);
        
        if (newSlots.length > 0) {
            const lastDate = new Date(newSlots[newSlots.length - 1].date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
            
            console.log(`- First slot: ${newSlots[0].date}`);
            console.log(`- Last slot: ${newSlots[newSlots.length - 1].date}`);
            console.log(`- Days coverage from today: ${daysFromToday}`);
            
            // Check if we have roughly 90 days of coverage
            if (daysFromToday >= 85 && daysFromToday <= 95) {
                console.log('✅ ROLLING WINDOW TEST PASSED: ~90 days of coverage maintained');
            } else if (daysFromToday < 85) {
                console.log('⚠️ WARNING: Less than 85 days of coverage');
            } else {
                console.log('✅ GOOD: More than 90 days of coverage');
            }
            
            // Show sample slots
            console.log('\n📊 Sample timeslots:');
            newSlots.slice(0, 3).forEach(slot => {
                console.log(`  ${slot.date}: ${slot.slots.length} time slots`);
            });
            console.log('  ...');
            newSlots.slice(-3).forEach(slot => {
                console.log(`  ${slot.date}: ${slot.slots.length} time slots`);
            });
        }
        
        console.log('\n🎉 ROLLING TIMESLOT TEST COMPLETED');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the test
testRollingTimeslotsAPI();
