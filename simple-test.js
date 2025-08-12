const fetch = require('node-fetch');

console.log('🚀 Starting Cart Booking Test...');

async function testCartBooking() {
  try {
    console.log('📋 Testing cart functionality...');
    
    // Test adding item to cart
    const cartData = {
      tourId: "6750a4b5c3b26fffb059d9e5",
      selectedDate: "2025-08-25",
      numberOfPersons: 2,
      pickupLocation: "Marina Bay Sands Hotel",
      totalPrice: 150
    };
    
    console.log('📅 Adding item for date:', cartData.selectedDate);
    console.log('📍 Pickup location:', cartData.pickupLocation);
    
    const response = await fetch('http://192.168.163.50:3002/api/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartData)
    });
    
    const result = await response.json();
    console.log('✅ Cart add response:', response.status, result);
    
    if (response.ok) {
      console.log('🎯 Test successful! Cart booking fixes are working!');
    } else {
      console.log('❌ Test failed:', result);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

testCartBooking();
