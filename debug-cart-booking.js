/**
 * Comprehensive cart booking debugging
 */

const axios = require('axios');

async function debugCartBooking() {
  try {
    console.log('🔍 COMPREHENSIVE CART BOOKING DEBUG');
    console.log('===================================\n');

    // Test 1: Check if the cart-booking endpoint exists
    console.log('1. Testing cart-booking endpoint existence...');
    try {
      // Send a deliberately invalid request to see if endpoint exists
      const response = await axios.post('http://localhost:3002/api/cart-booking', {});
    } catch (error) {
      if (error.response) {
        console.log(`✅ Endpoint exists - Status: ${error.response.status}`);
        console.log(`Response: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log('❌ Endpoint not found or network error');
        return;
      }
    }

    // Test 2: Check server logs or available routes
    console.log('\n2. Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:3002/api/timeslots/server-datetime');
      if (healthResponse.data.success) {
        console.log('✅ Server is running and responsive');
      }
    } catch (error) {
      console.log('❌ Server health check failed');
      return;
    }

    // Test 3: Try to find any user by checking tours (users might be embedded in bookings)
    console.log('\n3. Checking for available data...');
    try {
      const toursResponse = await axios.get('http://localhost:3002/api/tours?limit=1');
      if (toursResponse.data.success) {
        console.log('✅ Tours API working');
        
        // Use a real package ID to create a test cart item scenario
        const tour = toursResponse.data.data[0];
        console.log(`Found tour: ${tour.title} (${tour._id})`);
        
        // Test 4: Try cart booking with a comprehensive test user
        console.log('\n4. Testing cart booking with comprehensive data...');
        
        const testUserEmail = 'debug@test.com';
        const bookingRequest = {
          userEmail: testUserEmail,
          contactInfo: {
            name: 'Debug Test User',
            email: testUserEmail,
            phone: '+60123456789',
            whatsapp: '+60123456789',
          }
        };

        console.log('Sending request:', JSON.stringify(bookingRequest, null, 2));

        try {
          const bookingResponse = await axios.post(
            'http://localhost:3002/api/cart-booking',
            bookingRequest,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('✅ Booking Success:', bookingResponse.data);

        } catch (bookingError) {
          if (bookingError.response) {
            console.log('❌ Booking Error Details:');
            console.log(`Status: ${bookingError.response.status}`);
            console.log(`Data:`, JSON.stringify(bookingError.response.data, null, 2));
            
            // Analyze the specific error
            const errorData = bookingError.response.data;
            if (errorData.errors) {
              console.log('\n🔍 Error Analysis:');
              errorData.errors.forEach(error => {
                console.log(`- ${error}`);
                
                if (error.includes('User not found')) {
                  console.log('  💡 Solution: The user needs to be registered in the system first');
                }
                if (error.includes('Cart is empty')) {
                  console.log('  💡 Solution: User needs to add items to cart before booking');
                }
              });
            }
            
            if (errorData.warnings) {
              console.log('\n⚠️  Warnings:');
              errorData.warnings.forEach(warning => {
                console.log(`- ${warning}`);
              });
            }
          }
        }
        
      } else {
        console.log('❌ No tours found');
      }
    } catch (error) {
      console.log('❌ Error checking tours:', error.message);
    }

    // Test 5: Validate the server-side cart booking service expectations
    console.log('\n5. Expected flow for cart booking:');
    console.log('   a) User must exist in User collection');
    console.log('   b) User must have items in Cart collection');
    console.log('   c) Cart items must be valid (not expired, packages exist)');
    console.log('   d) ContactInfo must have name, email, phone');
    
    console.log('\n💡 To fix the 400 error:');
    console.log('   1. Ensure user is logged in and exists in database');
    console.log('   2. Ensure user has valid items in their cart');
    console.log('   3. Check that all required fields are provided');
    console.log('   4. Check server logs for more detailed error messages');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCartBooking();
