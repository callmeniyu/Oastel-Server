/**
 * Test with actual user data from the database
 */

const axios = require('axios');

async function testWithRealUser() {
  try {
    console.log('🔍 Testing Cart Booking with Real User Data');
    console.log('=============================================\n');

    // First, let's get users from the database
    console.log('1. Getting users...');
    try {
      const usersResponse = await axios.get('http://192.168.163.50:3002/api/users?limit=5');
      if (usersResponse.data.success && usersResponse.data.data.length > 0) {
        console.log(`Found ${usersResponse.data.data.length} users:`);
        usersResponse.data.data.forEach((user, i) => {
          console.log(`  ${i + 1}. ${user.email} (${user.name || 'No name'})`);
        });

        const testUser = usersResponse.data.data[0];
        console.log(`\nUsing user: ${testUser.email}\n`);

        // Test cart booking with real user
        const bookingRequest = {
          userEmail: testUser.email,
          contactInfo: {
            name: testUser.name || 'Test User',
            email: testUser.email,
            phone: '+1234567890',
            whatsapp: '+1234567890',
          }
        };

        console.log('2. Testing cart booking with real user...');
        console.log('Request:', JSON.stringify(bookingRequest, null, 2));

        try {
          const response = await axios.post(
            'http://192.168.163.50:3002/api/cart-booking',
            bookingRequest
          );

          console.log('✅ Success:', response.status);
          console.log('Response:', JSON.stringify(response.data, null, 2));

        } catch (error) {
          if (error.response) {
            console.log('❌ HTTP Error:', error.response.status);
            console.log('Error Response:', JSON.stringify(error.response.data, null, 2));

            if (error.response.data && error.response.data.errors) {
              console.log('\nError Analysis:');
              error.response.data.errors.forEach(err => {
                console.log(`- ${err}`);
              });
            }
          } else {
            console.log('❌ Network Error:', error.message);
          }
        }

      } else {
        console.log('❌ No users found in database');
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('❌ Users API not found - might need to check the endpoint');
      } else {
        console.log('❌ Error getting users:', error.message);
      }
    }

    // Also check if cart API exists
    console.log('\n3. Checking cart API...');
    try {
      // Try to get cart for a test user (this might also fail but helps debug)
      const cartResponse = await axios.get('http://192.168.163.50:3002/api/cart?userEmail=test@example.com');
      console.log('Cart API response:', cartResponse.status);
    } catch (error) {
      if (error.response) {
        console.log('Cart API error:', error.response.status, error.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithRealUser();
