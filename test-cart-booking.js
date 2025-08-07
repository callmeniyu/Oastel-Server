/**
 * Test cart booking API to identify the 400 error
 */

const axios = require('axios');

async function testCartBooking() {
  try {
    console.log('🧪 Testing Cart Booking API');
    console.log('===========================\n');

    // Test the cart booking request with the exact format the client is sending
    const bookingRequest = {
      userEmail: 'test@example.com',
      contactInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        whatsapp: '+1234567890',
      }
    };

    console.log('Sending cart booking request:', JSON.stringify(bookingRequest, null, 2));

    try {
      const response = await axios.post(
        'http://192.168.163.50:3002/api/cart-booking',
        bookingRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Success:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
      if (error.response) {
        console.log('❌ HTTP Error:', error.response.status);
        console.log('Error Message:', error.response.data);
        
        // This helps us understand what's wrong
        if (error.response.status === 400) {
          console.log('\n🔍 Analysis: 400 Bad Request');
          console.log('The server rejected the request due to:');
          if (error.response.data && error.response.data.message) {
            console.log('- ', error.response.data.message);
          }
        }
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }

    // Test with missing fields to see validation
    console.log('\n🧪 Testing with missing userEmail...');
    try {
      const invalidRequest = {
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
        }
      };

      await axios.post('http://192.168.163.50:3002/api/cart-booking', invalidRequest);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Expected validation error:', error.response.data.message);
      }
    }

    // Test with missing contactInfo fields
    console.log('\n🧪 Testing with missing contactInfo fields...');
    try {
      const invalidRequest2 = {
        userEmail: 'test@example.com',
        contactInfo: {
          name: 'Test User',
          // missing email and phone
        }
      };

      await axios.post('http://192.168.163.50:3002/api/cart-booking', invalidRequest2);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Expected validation error:', error.response.data.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCartBooking();
