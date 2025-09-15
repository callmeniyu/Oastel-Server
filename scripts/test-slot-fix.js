require('dotenv').config();
const axios = require('axios');

async function testBookingSlotUpdate() {
  try {
    console.log('Testing if slot updates work correctly with date format fix...');
    
    // Check current slot state
    const packageId = '68c26d0968b239abb121386e';
    const date = '2025-09-16';
    const time = '08:15';
    
    console.log('Current state should show:');
    console.log('- Capacity: 15');
    console.log('- Booked: 8');
    console.log('- Available: 7');
    console.log('');
    
    // Test the slot check endpoint
    const slotCheckUrl = `http://localhost:3002/api/tours/check-availability/${packageId}`;
    const response = await axios.post(slotCheckUrl, {
      date: date,
      time: time,
      guests: 1
    });
    
    if (response.data.available) {
      console.log('✅ Slot availability check PASSED');
      console.log(`Available slots: ${response.data.availableSlots}`);
      console.log(`Total capacity: ${response.data.totalCapacity}`);
      
      if (response.data.availableSlots === 7) {
        console.log('✅ Slot count is CORRECT! Shows 7 available seats');
      } else {
        console.log(`❌ Slot count is INCORRECT. Expected 7, got ${response.data.availableSlots}`);
      }
    } else {
      console.log('❌ Slot availability check failed');
      console.log(response.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testBookingSlotUpdate();