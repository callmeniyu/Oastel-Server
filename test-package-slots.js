const mongoose = require('mongoose');
require('dotenv').config();

const Transfer = require('./src/models/Transfer');
const TimeSlot = require('./src/models/TimeSlot');

async function checkPackageSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to DB');
    
    // Check the specific transfer package
    const transfer = await Transfer.findById('68b521f827021a6fb08770cb');
    if (!transfer) {
      console.log('❌ Transfer not found');
      return;
    }
    
    console.log('\n📦 Transfer Package:');
    console.log('- Title:', transfer.title);
    console.log('- Created:', transfer.createdAt);
    console.log('- Times:', transfer.times);
    
    // Check its timeslots
    const slots = await TimeSlot.find({ 
      packageType: 'transfer', 
      packageId: new mongoose.Types.ObjectId('68b521f827021a6fb08770cb') 
    }).sort({ date: 1 });
    
    console.log('\n⏰ Time Slots Analysis:');
    console.log('- Total slot documents:', slots.length);
    
    if (slots.length > 0) {
      const firstDate = new Date(slots[0].date);
      const lastSlot = slots[slots.length - 1];
      const lastDate = new Date(lastSlot.date);
      const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
      
      console.log('- First slot date:', slots[0].date);
      console.log('- Last slot date:', lastSlot.date);
      console.log('- Days covered:', daysDiff + 1);
      
      // Check how many days ahead from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysAheadLast = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
      console.log('- Days ahead from today (last slot):', daysAheadLast);
      
      // Show first few and last few slots
      console.log('\n📅 First 5 slots:');
      slots.slice(0, 5).forEach(slot => {
        console.log(`  ${slot.date}: ${slot.slots.length} time slots`);
      });
      
      console.log('\n📅 Last 5 slots:');
      slots.slice(-5).forEach(slot => {
        console.log(`  ${slot.date}: ${slot.slots.length} time slots`);
      });
    }
    
    // Check when this package was created vs current slots
    const packageCreated = new Date(transfer.createdAt);
    const daysFromCreation = Math.ceil((new Date() - packageCreated) / (1000 * 60 * 60 * 24));
    console.log('\n📊 Package Analysis:');
    console.log('- Package created:', packageCreated.toISOString().split('T')[0]);
    console.log('- Days since creation:', daysFromCreation);
    
    // Check if we need to generate more slots
    if (slots.length > 0) {
      const lastSlotDate = new Date(slots[slots.length - 1].date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((lastSlotDate - today) / (1000 * 60 * 60 * 24));
      
      console.log('- Days remaining in slot window:', daysRemaining);
      
      if (daysRemaining < 30) {
        console.log('⚠️  WARNING: Less than 30 days of slots remaining!');
        console.log('   Need to generate more slots soon.');
      } else if (daysRemaining < 10) {
        console.log('🚨 URGENT: Less than 10 days of slots remaining!');
        console.log('   Need to generate more slots immediately.');
      } else {
        console.log('✅ Slots look good, plenty of days remaining.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from DB');
  }
}

checkPackageSlots();
