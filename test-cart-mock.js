/**
 * Test cart validation with exact cart item format
 */

// Mock cart item data (similar to what would be in the cart)
const mockCartItem = {
  _id: 'cart-item-123',
  packageId: '688d00f3e693f8cdb44cd05a',
  packageType: 'tour',
  selectedDate: '2025-08-15',  // This should be YYYY-MM-DD format
  selectedTime: '10:00',
  adults: 2,
  children: 0,
  packageDetails: {
    title: 'Test Tour',
    slug: '688d00f3e693f8cdb44cd05a'
  }
};

// Mock cart item with ISO date (problematic format)
const mockCartItemWithISODate = {
  _id: 'cart-item-456',
  packageId: '688d00f3e693f8cdb44cd05a',
  packageType: 'tour',
  selectedDate: '2025-08-15T00:00:00.000Z',  // This was causing the 404
  selectedTime: '10:00',
  adults: 2,
  children: 0,
  packageDetails: {
    title: 'Test Tour',
    slug: '688d00f3e693f8cdb44cd05a'
  }
};

// Simulate the cart validation logic (from cart page)
function simulateCartValidation(item) {
  const packageId = item.packageId || item.packageDetails?.slug;
  const selectedDate = item.selectedDate || item.bookingDate;
  const time = item.selectedTime || item.timeSlot || "";
  const adults = item.adults || 0;
  const children = item.children || 0;
  const guests = adults + children;

  // This is the key fix - format the date properly
  let formattedDate = selectedDate;
  if (selectedDate.includes('T')) {
    formattedDate = selectedDate.split('T')[0];
  }

  console.log('Cart validation simulation:');
  console.log('  Original date:', selectedDate);
  console.log('  Formatted date:', formattedDate);
  console.log('  Package ID:', packageId);
  console.log('  Time:', time);
  console.log('  Guests:', guests);
  
  const url = `http://192.168.163.50:3002/api/timeslots/available?packageType=${item.packageType}&packageId=${packageId}&date=${formattedDate}`;
  console.log('  API URL:', url);
  
  return { packageId, formattedDate, time, guests, url };
}

console.log('🧪 Testing Cart Validation Logic');
console.log('================================\n');

console.log('Test 1: Normal date format (YYYY-MM-DD)');
simulateCartValidation(mockCartItem);

console.log('\nTest 2: ISO date format (problematic)');
simulateCartValidation(mockCartItemWithISODate);

console.log('\n✅ Both should now produce the same formatted date!');
console.log('The fix ensures ISO dates are converted to YYYY-MM-DD format.');

// Test the actual API call
const axios = require('axios');

async function testActualAPI() {
  console.log('\n🔗 Testing actual API calls...\n');
  
  const testCases = [mockCartItem, mockCartItemWithISODate];
  
  for (let i = 0; i < testCases.length; i++) {
    const item = testCases[i];
    console.log(`Test ${i + 1}: ${item.selectedDate.includes('T') ? 'ISO Date' : 'Normal Date'}`);
    
    const validation = simulateCartValidation(item);
    
    try {
      const response = await axios.get(validation.url);
      if (response.data.success) {
        console.log(`  ✅ SUCCESS: Found ${response.data.data.length} slots`);
        
        // Find the specific time slot
        const slot = response.data.data.find(s => s.time === validation.time);
        if (slot) {
          const availableCapacity = slot.capacity - slot.bookedCount;
          const isValidForCart = availableCapacity > 0 && validation.guests <= availableCapacity;
          console.log(`  📊 Slot capacity: ${slot.capacity}, booked: ${slot.bookedCount}, available: ${availableCapacity}`);
          console.log(`  🎯 Cart validation result: ${isValidForCart ? '✅ VALID' : '❌ INVALID'}`);
        } else {
          console.log(`  ❌ Time slot ${validation.time} not found`);
        }
      } else {
        console.log(`  ❌ API error: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.response ? error.response.status : error.message}`);
    }
    console.log('');
  }
}

testActualAPI();
