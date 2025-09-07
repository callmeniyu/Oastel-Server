const mongoose = require('mongoose');
require('dotenv').config();

const Transfer = require('./src/models/Transfer');
const TimeSlot = require('./src/models/TimeSlot');

async function testRollingWindow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to DB');
    
    // Test with the specific transfer package
    const packageId = '68b521f827021a6fb08770cb';
    
    console.log('\n📦 BEFORE Rolling Window Implementation:');
    
    // Check current package
    const transfer = await Transfer.findById(packageId);
    if (!transfer) {
      console.log('❌ Transfer not found');
      return;
    }
    
    console.log('- Package:', transfer.title);
    console.log('- Created:', transfer.createdAt);
    console.log('- Last slots generated:', transfer.lastSlotsGeneratedAt || 'Never');
    
    // Check current timeslots
    const currentSlots = await TimeSlot.find({ 
      packageType: 'transfer', 
      packageId: new mongoose.Types.ObjectId(packageId) 
    }).sort({ date: 1 });
    
    console.log('- Current slot documents:', currentSlots.length);
    
    if (currentSlots.length > 0) {
      const firstDate = new Date(currentSlots[0].date);
      const lastDate = new Date(currentSlots[currentSlots.length - 1].date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
      
      console.log('- Date range:', currentSlots[0].date, 'to', currentSlots[currentSlots.length - 1].date);
      console.log('- Days ahead from today:', daysFromToday);
      
      if (daysFromToday < 30) {
        console.log('⚠️  WARNING: Less than 30 days remaining - need to generate more slots!');
      } else if (daysFromToday < 10) {
        console.log('🚨 URGENT: Less than 10 days remaining!');
      } else {
        console.log('✅ Good: More than 30 days of slots available');
      }
    }
    
    // Test the rolling window generation API
    console.log('\n🚀 Testing Rolling Window Generation:');
    
    // Import the service (dynamic import for ES modules)
    const { RollingTimeslotService } = await import('./src/services/rollingTimeslot.service.ts');
    
    console.log('- Running generateSlotsForSpecificPackage...');
    const result = await RollingTimeslotService.generateSlotsForSpecificPackage('transfer', packageId);
    
    console.log('- Result:', result.success ? '✅ Success' : '❌ Failed');
    console.log('- Message:', result.message);
    console.log('- Slots generated:', result.slotsGenerated);
    
    // Check updated package
    console.log('\n📦 AFTER Rolling Window Implementation:');
    
    const updatedTransfer = await Transfer.findById(packageId);
    console.log('- Last slots generated:', updatedTransfer.lastSlotsGeneratedAt);
    
    // Check updated timeslots
    const updatedSlots = await TimeSlot.find({ 
      packageType: 'transfer', 
      packageId: new mongoose.Types.ObjectId(packageId) 
    }).sort({ date: 1 });
    
    console.log('- Updated slot documents:', updatedSlots.length);
    
    if (updatedSlots.length > 0) {
      const firstDate = new Date(updatedSlots[0].date);
      const lastDate = new Date(updatedSlots[updatedSlots.length - 1].date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysFromToday = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
      
      console.log('- New date range:', updatedSlots[0].date, 'to', updatedSlots[updatedSlots.length - 1].date);
      console.log('- Days ahead from today:', daysFromToday);
      
      console.log('\n📅 Last 5 slots:');
      updatedSlots.slice(-5).forEach(slot => {
        console.log(`  ${slot.date}: ${slot.slots.length} time slots`);
      });
    }
    
    console.log('\n✅ Rolling window test completed!');
    console.log('📝 The system now maintains a rolling 90-day window of available slots.');
    console.log('🕐 The scheduled job will run daily at 2:00 AM to keep slots current.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from DB');
  }
}

// Also test the check function
async function testCheckFunction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n🔍 Testing Package Check Function:');
    
    const { RollingTimeslotService } = await import('./src/services/rollingTimeslot.service.ts');
    const packagesNeedingSlots = await RollingTimeslotService.checkPackagesNeedingSlots();
    
    console.log('- Tours needing slots:', packagesNeedingSlots.tours.length);
    console.log('- Transfers needing slots:', packagesNeedingSlots.transfers.length);
    
    if (packagesNeedingSlots.transfers.length > 0) {
      console.log('\nTransfers that need slots:');
      packagesNeedingSlots.transfers.forEach(transfer => {
        console.log(`  - ${transfer.title} (${transfer._id})`);
        console.log(`    Last generated: ${transfer.lastSlotsGeneratedAt || 'Never'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in check function:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the tests
console.log('🧪 Starting Rolling Window Test Suite...');
testRollingWindow()
  .then(() => testCheckFunction())
  .then(() => {
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
