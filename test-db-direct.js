// Direct MongoDB test for rolling timeslots
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testTimeslotsInDB() {
    let client;
    try {
        console.log('🔍 CHECKING TIMESLOTS IN DATABASE');
        console.log('==================================');
        
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        
        const db = client.db();
        const testPackageId = '68b521f827021a6fb08770cb';
        
        // Check the transfer package
        console.log('\n📋 CHECKING TRANSFER PACKAGE');
        const transfer = await db.collection('transfers').findOne({ 
            _id: { $oid: testPackageId } 
        });
        
        if (transfer) {
            console.log(`✅ Found transfer: ${transfer.title}`);
            console.log(`- Status: ${transfer.status}`);
            console.log(`- Times: ${transfer.times ? transfer.times.length : 0}`);
            console.log(`- Last slots generated: ${transfer.lastSlotsGeneratedAt || 'Never'}`);
        } else {
            console.log('❌ Transfer not found');
        }
        
        // Check existing timeslots
        console.log('\n📅 CHECKING EXISTING TIMESLOTS');
        const ObjectId = require('mongodb').ObjectId;
        const slots = await db.collection('timeslots').find({
            packageType: 'transfer',
            packageId: new ObjectId(testPackageId)
        }).sort({ date: 1 }).toArray();
        
        console.log(`- Total timeslot documents: ${slots.length}`);
        
        if (slots.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const firstDate = new Date(slots[0].date);
            const lastDate = new Date(slots[slots.length - 1].date);
            const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
            
            console.log(`- Date range: ${slots[0].date} to ${slots[slots.length - 1].date}`);
            console.log(`- Days coverage from today: ${daysFromToday}`);
            
            // Check coverage
            if (daysFromToday >= 85 && daysFromToday <= 95) {
                console.log('✅ GOOD: ~90 days of coverage');
            } else if (daysFromToday < 85) {
                console.log('⚠️ WARNING: Less than 85 days of coverage');
            } else {
                console.log('✅ EXCELLENT: More than 90 days of coverage');
            }
            
            // Sample slots
            console.log('\n📊 SAMPLE TIMESLOTS:');
            const recentSlots = slots.filter(slot => {
                const slotDate = new Date(slot.date);
                const daysDiff = (slotDate - today) / (1000 * 60 * 60 * 24);
                return daysDiff >= 0 && daysDiff <= 7;
            });
            
            console.log(`- Slots for next 7 days: ${recentSlots.length}`);
            recentSlots.slice(0, 5).forEach(slot => {
                const slotDate = new Date(slot.date);
                const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
                console.log(`  ${dayName} ${slot.date}: ${slot.slots ? slot.slots.length : 0} time options`);
            });
        }
        
        // Check all packages that might need slots
        console.log('\n🔍 CHECKING ALL PACKAGES NEEDING SLOTS');
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 85); // 85 days from now
        
        // Check transfers
        const transfersNeedingSlots = await db.collection('transfers').find({
            status: 'active',
            $or: [
                { lastSlotsGeneratedAt: { $exists: false } },
                { lastSlotsGeneratedAt: null },
                { lastSlotsGeneratedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            ]
        }).toArray();
        
        console.log(`- Transfers needing slots: ${transfersNeedingSlots.length}`);
        
        // Check tours
        const toursNeedingSlots = await db.collection('tours').find({
            status: 'active',
            $or: [
                { lastSlotsGeneratedAt: { $exists: false } },
                { lastSlotsGeneratedAt: null },
                { lastSlotsGeneratedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            ]
        }).toArray();
        
        console.log(`- Tours needing slots: ${toursNeedingSlots.length}`);
        
        console.log('\n✅ DATABASE VERIFICATION COMPLETED');
        
        if (slots.length === 0) {
            console.log('\n⚠️ NO TIMESLOTS FOUND - Need to generate slots manually');
            console.log('Use the API: POST /api/rolling-timeslots/generate/transfer/' + testPackageId);
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Save output to file for verification
const fs = require('fs');
const originalLog = console.log;
const logMessages = [];

console.log = (...args) => {
    const message = args.join(' ');
    logMessages.push(message);
    originalLog(...args);
};

testTimeslotsInDB().then(() => {
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results-${timestamp}.txt`;
    fs.writeFileSync(filename, logMessages.join('\n'));
    console.log(`\n📝 Results saved to: ${filename}`);
});
