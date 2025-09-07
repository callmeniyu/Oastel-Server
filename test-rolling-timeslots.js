const mongoose = require('mongoose');
require('dotenv').config();

// Import models directly
const { Transfer } = require('./src/models/Transfer');
const { TimeSlot } = require('./src/models/TimeSlot');

async function testRollingTimeslots() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const testPackageId = '68b521f827021a6fb08770cb';
        
        // Step 1: Check the current state of the test package
        console.log('\n📋 STEP 1: Checking current state of test package');
        const transfer = await Transfer.findById(testPackageId);
        if (!transfer) {
            console.log('❌ Test transfer not found');
            return;
        }
        
        console.log(`- Transfer: ${transfer.title}`);
        console.log(`- Created: ${transfer.createdAt}`);
        console.log(`- Last slots generated: ${transfer.lastSlotsGeneratedAt || 'Never'}`);
        console.log(`- Times: ${transfer.times}`);
        
        // Step 2: Check existing timeslots
        console.log('\n📅 STEP 2: Checking existing timeslots');
        const existingSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 });
        
        console.log(`- Total slot documents: ${existingSlots.length}`);
        
        if (existingSlots.length > 0) {
            const firstDate = new Date(existingSlots[0].date);
            const lastDate = new Date(existingSlots[existingSlots.length - 1].date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
            
            console.log(`- First slot: ${existingSlots[0].date}`);
            console.log(`- Last slot: ${existingSlots[existingSlots.length - 1].date}`);
            console.log(`- Days coverage from today: ${daysFromToday}`);
            
            // Show first and last few slots
            console.log('- First 3 slot dates:');
            existingSlots.slice(0, 3).forEach(slot => {
                console.log(`  ${slot.date} (${slot.slots.length} times)`);
            });
            
            console.log('- Last 3 slot dates:');
            existingSlots.slice(-3).forEach(slot => {
                console.log(`  ${slot.date} (${slot.slots.length} times)`);
            });
        }
        
        // Step 3: Test the rolling timeslot service
        console.log('\n🔄 STEP 3: Testing rolling timeslot service');
        
        // Import the service using ts-node
        const tsNode = require('ts-node');
        tsNode.register();
        const { RollingTimeslotService } = require('./src/services/rollingTimeslot.service');
        
        // Generate slots for the test package
        console.log('- Generating slots for test package...');
        const result = await RollingTimeslotService.generateSlotsForSpecificPackage(
            'transfer',
            testPackageId
        );
        
        console.log(`- Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`- Message: ${result.message}`);
        console.log(`- Slots generated: ${result.slotsGenerated}`);
        
        // Step 4: Verify the new state
        console.log('\n✅ STEP 4: Verifying new state');
        
        // Check updated package
        const updatedTransfer = await Transfer.findById(testPackageId);
        console.log(`- Last slots generated (updated): ${updatedTransfer.lastSlotsGeneratedAt}`);
        
        // Check new timeslots
        const newSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 });
        
        console.log(`- Total slot documents (after): ${newSlots.length}`);
        
        if (newSlots.length > 0) {
            const firstDate = new Date(newSlots[0].date);
            const lastDate = new Date(newSlots[newSlots.length - 1].date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
            
            console.log(`- First slot (after): ${newSlots[0].date}`);
            console.log(`- Last slot (after): ${newSlots[newSlots.length - 1].date}`);
            console.log(`- Days coverage from today (after): ${daysFromToday}`);
            
            // Check if we have roughly 90 days of coverage
            if (daysFromToday >= 85 && daysFromToday <= 95) {
                console.log('✅ ROLLING WINDOW TEST PASSED: ~90 days of coverage maintained');
            } else if (daysFromToday < 85) {
                console.log('⚠️ WARNING: Less than 85 days of coverage');
            } else {
                console.log('✅ GOOD: More than 90 days of coverage');
            }
        }
        
        // Step 5: Test the full rolling generation
        console.log('\n🔄 STEP 5: Testing full rolling generation for all packages');
        const fullResult = await RollingTimeslotService.generateRollingTimeslots();
        
        console.log(`- Packages processed: ${fullResult.packagesProcessed}`);
        console.log(`- Slots generated: ${fullResult.slotsGenerated}`);
        console.log(`- Errors: ${fullResult.errors.length}`);
        if (fullResult.errors.length > 0) {
            console.log('- Error details:', fullResult.errors);
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
console.log('🧪 TESTING ROLLING TIMESLOT SYSTEM');
console.log('==================================');
testRollingTimeslots();
