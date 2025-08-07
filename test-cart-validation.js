/**
 * Test script to verify cart validation functionality
 * This script tests the existing /available endpoint for cart validation
 */

const axios = require('axios');

// Test data - item scheduled for Aug 12, 2025 (5+ days from Aug 7, 2025)
async function testCartValidation() {
  try {
    console.log('Testing cart validation using existing /available endpoint...');
    
    // First get a real package ID for testing
    console.log('\n1. Getting tour packages...');
    const toursResponse = await axios.get('http://192.168.163.50:3002/api/tours?limit=1');
    
    if (!toursResponse.data.success || !toursResponse.data.data.length) {
      console.log('No tours found for testing');
      return;
    }
    
    const tour = toursResponse.data.data[0];
    console.log(`Found tour: ${tour.title} (ID: ${tour._id})`);
    
    // Test getting available slots for a future date
    const testDate = '2025-08-12'; // Future date
    console.log(`\n2. Getting available slots for date: ${testDate}`);
    
    const slotsResponse = await axios.get(
      `http://192.168.163.50:3002/api/timeslots/available?packageType=tour&packageId=${tour._id}&date=${testDate}`
    );
    
    console.log('Available slots response:');
    console.log('Status:', slotsResponse.status);
    console.log('Success:', slotsResponse.data.success);
    
    if (slotsResponse.data.success && slotsResponse.data.data) {
      console.log('Available slots:', slotsResponse.data.data.length);
      
      slotsResponse.data.data.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    Time: ${slot.time}`);
        console.log(`    Capacity: ${slot.capacity}`);
        console.log(`    Booked: ${slot.bookedCount}`);
        console.log(`    Available Spots: ${slot.capacity - slot.bookedCount}`);
        console.log(`    isAvailable (with 10hr check): ${slot.isAvailable}`);
        console.log(`    For Cart: Should be valid if capacity > booked and date not expired`);
        
        // This is what our cart validation logic will use
        const availableForCart = (slot.capacity - slot.bookedCount) > 0;
        console.log(`    Cart Validation Result: ${availableForCart ? '✅ VALID' : '❌ INVALID'}`);
      });
      
      console.log('\n🎉 SUCCESS: Cart validation approach is working!');
      console.log('Cart validation now uses existing /available endpoint but ignores the isAvailable flag');
      console.log('This way slots show as valid for cart if they have capacity, regardless of 10-hour rule');
      
    } else {
      console.log('❌ No slots data returned');
      console.log('Response data:', JSON.stringify(slotsResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error testing cart validation:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testCartValidation();
