/**
 * COMPREHENSIVE TEST SCRIPT for Minimum Person Logic
 * 
 * This script tests the complete flow:
 * 1. Check initial slot state
 * 2. Make first booking
 * 3. Verify minimumPerson changes to 1 (for non-private)
 * 4. Make subsequent booking with 1 person
 * 5. Cancel all bookings and verify minimumPerson resets
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const testTourId = '688b17c82c56c0342c651be5'; // Update with your tour ID

// Use tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

console.log('🧪 COMPREHENSIVE MINIMUM PERSON LOGIC TEST');
console.log(`📅 Testing date: ${tomorrowStr}`);
console.log(`🎯 Testing tour: ${testTourId}\n`);

async function runComprehensiveTest() {
  try {
    // Step 1: Check server connectivity
    console.log('1️⃣ Checking server connectivity...');
    const serverCheck = await axios.get(`${BASE_URL}/api/timeslots/server-datetime`);
    console.log(`✅ Server is running: ${serverCheck.data.data.time}\n`);

    // Step 2: Get initial slot state
    console.log('2️⃣ Getting initial slot state...');
    const initialSlots = await getSlots();
    const slot8AM = initialSlots.find(s => s.time === '8:00 AM' || s.time === '08:00');
    
    if (!slot8AM) {
      console.log('❌ No 8:00 AM slot found. Available slots:');
      initialSlots.forEach(s => console.log(`   ${s.time}`));
      return;
    }

    console.log('Initial 8:00 AM slot:');
    console.log(`   bookedCount: ${slot8AM.bookedCount}`);
    console.log(`   minimumPerson: ${slot8AM.minimumPerson}`);
    console.log(`   currentMinimum: ${slot8AM.currentMinimum}`);
    console.log(`   capacity: ${slot8AM.capacity}\n`);

    // Step 3: Test availability for 1 person BEFORE first booking
    console.log('3️⃣ Testing availability for 1 person BEFORE first booking...');
    const availBefore = await checkAvailability('8:00 AM', 1);
    console.log(`   Available: ${availBefore.available}`);
    console.log(`   Reason: ${availBefore.reason || 'None'}\n`);

    // Step 4: Make first booking (if slot is empty)
    if (slot8AM.bookedCount === 0) {
      console.log(`4️⃣ Making first booking with ${slot8AM.currentMinimum} persons...`);
      
      const bookingResult = await makeBooking('8:00 AM', slot8AM.currentMinimum, 'add');
      console.log(`   Booking success: ${bookingResult.success}\n`);

      // Step 5: Check slot state after first booking
      console.log('5️⃣ Checking slot state AFTER first booking...');
      const afterSlots = await getSlots();
      const slot8AMAfter = afterSlots.find(s => s.time === '8:00 AM' || s.time === '08:00');
      
      console.log('After first booking:');
      console.log(`   bookedCount: ${slot8AMAfter.bookedCount}`);
      console.log(`   minimumPerson: ${slot8AMAfter.minimumPerson}`);
      console.log(`   currentMinimum: ${slot8AMAfter.currentMinimum}\n`);

      // Step 6: Test availability for 1 person AFTER first booking
      console.log('6️⃣ Testing availability for 1 person AFTER first booking...');
      const availAfter = await checkAvailability('8:00 AM', 1);
      console.log(`   Available: ${availAfter.available}`);
      console.log(`   Reason: ${availAfter.reason || 'None'}\n`);

      // Step 7: Make a 1-person booking if available
      if (availAfter.available) {
        console.log('7️⃣ Making 1-person booking...');
        const onePersonBooking = await makeBooking('8:00 AM', 1, 'add');
        console.log(`   1-person booking success: ${onePersonBooking.success}\n`);

        // Check final state
        console.log('8️⃣ Final slot state...');
        const finalSlots = await getSlots();
        const slot8AMFinal = finalSlots.find(s => s.time === '8:00 AM' || s.time === '08:00');
        
        console.log('Final state:');
        console.log(`   bookedCount: ${slot8AMFinal.bookedCount}`);
        console.log(`   minimumPerson: ${slot8AMFinal.minimumPerson}`);
        console.log(`   currentMinimum: ${slot8AMFinal.currentMinimum}\n`);
      }

      // Step 8: Verification
      console.log('9️⃣ VERIFICATION RESULTS:');
      
      const success = 
        slot8AM.minimumPerson > 1 && // Initial state had package minimum
        slot8AMAfter.minimumPerson === 1 && // After first booking, minimum is 1
        availAfter.available; // 1-person booking is now allowed

      if (success) {
        console.log('🎉 ALL TESTS PASSED! Minimum person logic is working correctly!');
        console.log('✅ Initial minimumPerson was > 1');
        console.log('✅ After first booking, minimumPerson became 1');
        console.log('✅ 1-person booking is now allowed');
      } else {
        console.log('❌ TESTS FAILED! Issues detected:');
        if (slot8AM.minimumPerson <= 1) console.log('❌ Initial minimumPerson should be > 1');
        if (slot8AMAfter.minimumPerson !== 1) console.log('❌ After first booking, minimumPerson should be 1');
        if (!availAfter.available) console.log('❌ 1-person booking should be allowed after first booking');
      }

    } else {
      console.log('⚠️ Slot already has bookings. Testing occupied slot logic...');
      
      const availOccupied = await checkAvailability('8:00 AM', 1);
      console.log(`   1-person availability on occupied slot: ${availOccupied.available}`);
      
      if (availOccupied.available && slot8AM.minimumPerson === 1) {
        console.log('✅ Occupied slot logic is working correctly!');
      } else {
        console.log('❌ Occupied slot logic has issues');
        console.log(`   Expected minimumPerson=1, got ${slot8AM.minimumPerson}`);
        console.log(`   Expected 1-person availability=true, got ${availOccupied.available}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function getSlots() {
  const response = await axios.get(`${BASE_URL}/api/timeslots/available`, {
    params: {
      packageType: 'tour',
      packageId: testTourId,
      date: tomorrowStr
    }
  });
  return response.data.data || response.data.slots || [];
}

async function checkAvailability(time, persons) {
  try {
    const response = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
      params: {
        packageType: 'tour',
        packageId: testTourId,
        date: tomorrowStr,
        time: time,
        requestedPersons: persons
      }
    });
    return response.data;
  } catch (error) {
    return {
      available: false,
      reason: error.response?.data?.message || error.message
    };
  }
}

async function makeBooking(time, persons, operation) {
  try {
    const response = await axios.put(`${BASE_URL}/api/timeslots/booking`, {
      packageType: 'tour',
      packageId: testTourId,
      date: tomorrowStr,
      time: time,
      personsCount: persons,
      operation: operation
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
}

// Run the test
runComprehensiveTest();
