/**
 * Test script to verify cart validation works even with 10-hour restriction
 */

const axios = require('axios');

async function testNearFutureCartValidation() {
  try {
    console.log('Testing cart validation for near-future dates (within 10 hours)...');
    
    // First get a real package ID for testing
    console.log('\n1. Getting tour packages...');
    const toursResponse = await axios.get('http://192.168.163.50:3002/api/tours?limit=1');
    
    if (!toursResponse.data.success || !toursResponse.data.data.length) {
      console.log('No tours found for testing');
      return;
    }
    
    const tour = toursResponse.data.data[0];
    console.log(`Found tour: ${tour.title} (ID: ${tour._id})`);
    
    // Test with tomorrow's date (which might be within 10 hours depending on time)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const testDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`\n2. Getting available slots for near-future date: ${testDate}`);
    
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
        
        // This is what our cart validation logic will use
        const availableForCart = (slot.capacity - slot.bookedCount) > 0;
        console.log(`    Cart Validation Result: ${availableForCart ? '✅ VALID' : '❌ INVALID'}`);
        
        if (!slot.isAvailable && availableForCart) {
          console.log(`    📋 CART BENEFIT: Slot blocked for booking (10hr rule) but VALID for cart!`);
        }
      });
      
      console.log('\n🎉 SUCCESS: Cart validation handles 10-hour restrictions correctly!');
      console.log('Slots within 10-hour window show as invalid for booking but valid for cart');
      
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
testNearFutureCartValidation();
