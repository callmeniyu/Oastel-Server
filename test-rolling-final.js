require('dotenv').config();
const mongoose = require('mongoose');

async function testRollingTimeslots() {
    try {
        console.log('🧪 TESTING ROLLING TIMESLOT SYSTEM');
        console.log('==================================');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const testPackageId = '68b521f827021a6fb08770cb';
        
        // Get the Transfer model
        const Transfer = mongoose.connection.db.collection('transfers');
        const TimeSlot = mongoose.connection.db.collection('timeslots');
        
        // Step 1: Check the current state
        console.log('\n📋 STEP 1: Checking current state of test package');
        const transfer = await Transfer.findOne({ _id: new mongoose.Types.ObjectId(testPackageId) });
        if (!transfer) {
            console.log('❌ Test transfer not found');
            return;
        }
        
        console.log(`- Transfer: ${transfer.title}`);
        console.log(`- Last slots generated: ${transfer.lastSlotsGeneratedAt || 'Never'}`);
        console.log(`- Times: ${transfer.times ? transfer.times.length : 0} time options`);
        
        // Step 2: Check existing timeslots
        console.log('\n📅 STEP 2: Checking existing timeslots');
        const existingSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 }).toArray();
        
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
            
            // Show first few slots
            console.log('- First 3 slot dates:');
            existingSlots.slice(0, 3).forEach(slot => {
                console.log(`  ${slot.date} (${slot.slots ? slot.slots.length : 0} times)`);
            });
            
            console.log('- Last 3 slot dates:');
            existingSlots.slice(-3).forEach(slot => {
                console.log(`  ${slot.date} (${slot.slots ? slot.slots.length : 0} times)`);
            });
        } else {
            console.log('- No existing timeslots found');
        }
        
        // Step 3: Test the rolling timeslot generation
        console.log('\n🔄 STEP 3: Testing rolling timeslot generation');
        
        // Register ts-node for TypeScript imports
        require('ts-node').register();
        const { RollingTimeslotService } = require('./src/services/rollingTimeslot.service');
        
        console.log('- Generating slots for test package...');
        const result = await RollingTimeslotService.generateSlotsForSpecificPackage(
            'transfer',
            testPackageId
        );
        
        console.log(`- Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`- Message: ${result.message}`);
        console.log(`- Slots generated: ${result.slotsGenerated}`);
        
        if (!result.success) {
            console.log('- Error details:', result.error);
        }
        
        // Step 4: Verify the new state
        console.log('\n✅ STEP 4: Verifying new state');
        
        // Check updated package
        const updatedTransfer = await Transfer.findOne({ _id: new mongoose.Types.ObjectId(testPackageId) });
        console.log(`- Last slots generated (updated): ${updatedTransfer.lastSlotsGeneratedAt}`);
        
        // Check new timeslots
        const newSlots = await TimeSlot.find({
            packageType: 'transfer',
            packageId: new mongoose.Types.ObjectId(testPackageId)
        }).sort({ date: 1 }).toArray();
        
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
            
            // Show distribution of slots
            const uniqueDates = [...new Set(newSlots.map(slot => slot.date))];
            console.log(`- Unique dates with slots: ${uniqueDates.length}`);
            
            // Show sample of recent slots
            const recentSlots = newSlots.filter(slot => {
                const slotDate = new Date(slot.date);
                const daysDiff = (slotDate - today) / (1000 * 60 * 60 * 24);
                return daysDiff >= 0 && daysDiff <= 10; // Next 10 days
            });
            
            console.log(`- Slots for next 10 days: ${recentSlots.length} documents`);
            if (recentSlots.length > 0) {
                recentSlots.slice(0, 5).forEach(slot => {
                    console.log(`  ${slot.date}: ${slot.slots ? slot.slots.length : 0} time options`);
                });
            }
        }
        
        // Step 5: Test the full rolling generation
        console.log('\n🔄 STEP 5: Testing full rolling generation for all packages');
        const fullResult = await RollingTimeslotService.generateRollingTimeslots();
        
        console.log(`- Packages processed: ${fullResult.packagesProcessed}`);
        console.log(`- Slots generated: ${fullResult.slotsGenerated}`);
        console.log(`- Errors: ${fullResult.errors.length}`);
        if (fullResult.errors.length > 0) {
            console.log('- Error details:', fullResult.errors.slice(0, 3)); // Show first 3 errors
        }
        
        console.log('\n🎉 ROLLING TIMESLOT TEST COMPLETED SUCCESSFULLY');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the test
testRollingTimeslots();
