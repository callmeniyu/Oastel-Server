const fetch = require('node-fetch');

async function testCartBooking() {
  try {
    console.log('=== TESTING CART BOOKING API ===');
    
    // Mock the session data that would come from NextAuth
    const mockSessionData = {
      user: {
        email: 'test@example.com',
        id: '6894d43ac8b4855cc3a6cd74', // From our test data
        name: 'Test User'
      },
      customerInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+60123456789',
        whatsapp: '+60123456789',
        address: 'Test Address, Kuala Lumpur'
      }
    };

    console.log('Request payload:', JSON.stringify(mockSessionData, null, 2));

    const response = await fetch('http://localhost:5000/api/cart-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockSessionData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('✅ Cart booking successful!');
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('❌ Cart booking failed');
      try {
        const errorResponse = JSON.parse(responseText);
        console.log('Error details:', JSON.stringify(errorResponse, null, 2));
      } catch (e) {
        console.log('Error response is not JSON');
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testCartBooking();
