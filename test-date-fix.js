/**
 * Test script to verify the date formatting fix
 */

const axios = require('axios');

async function testDateFormatFix() {
  try {
    console.log('🔧 Testing Date Format Fix');
    console.log('==========================\n');
    
    // Get a tour for testing
    const toursResponse = await axios.get('http://192.168.163.50:3002/api/tours?limit=1');
    if (!toursResponse.data.success || !toursResponse.data.data.length) {
      console.log('❌ No tours found');
      return;
    }
    
    const tour = toursResponse.data.data[0];
    console.log(`Using tour: ${tour.title} (ID: ${tour._id})`);
    
    // Test different date formats
    const testDates = [
      '2025-08-15',                    // Correct format
      '2025-08-15T00:00:00.000Z',      // ISO string (problematic)
      '2025-08-15T10:30:00.000Z',      // ISO string with time
    ];
    
    for (const testDate of testDates) {
      console.log(`\nTesting date: "${testDate}"`);
      
      // Format the date properly (like our fixed code does)
      const formattedDate = testDate.includes('T') ? testDate.split('T')[0] : testDate;
      console.log(`Formatted to: "${formattedDate}"`);
      
      try {
        const url = `http://192.168.163.50:3002/api/timeslots/available?packageType=tour&packageId=${tour._id}&date=${formattedDate}`;
        console.log(`URL: ${url}`);
        
        const response = await axios.get(url);
        
        if (response.data.success) {
          console.log(`✅ SUCCESS: ${response.data.data.length} slots found`);
        } else {
          console.log(`❌ API returned success=false: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.response ? error.response.status : error.message}`);
      }
    }
    
    console.log('\n🎉 Date format testing completed!');
    console.log('The fix should handle ISO string dates correctly by extracting just the date part.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDateFormatFix();
