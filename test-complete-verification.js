const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const testTourId = '688b17c82c56c0342c651be5';

// Use tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

console.log(`📅 Testing with date: ${tomorrowStr}`);

async function completeMinimumPersonTest() {
    try {
        console.log('🧪 Complete Minimum Person Logic Test\n');
        
        // Step 1: Get initial slot state
        console.log('1️⃣ Getting initial slot state...');
        const initialResponse = await axios.get(`${BASE_URL}/api/timeslots/available`, {
            params: {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr
            }
        });
        
        const initialSlots = initialResponse.data.slots;
        const initialSlot8AM = initialSlots?.find(s => s.time === '8:00 AM');
        
        if (!initialSlot8AM) {
            console.log('❌ No 8:00 AM slot found');
            return;
        }
        
        console.log('Initial 8:00 AM slot state:', {
            bookedCount: initialSlot8AM.bookedCount,
            minimumPerson: initialSlot8AM.minimumPerson,
            currentMinimum: initialSlot8AM.currentMinimum,
            capacity: initialSlot8AM.capacity,
            isAvailable: initialSlot8AM.isAvailable
        });
        
        // Step 2: Test availability for 1 person BEFORE first booking
        console.log('\n2️⃣ Testing availability for 1 person BEFORE first booking...');
        try {
            const availBefore = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr,
                    time: '8:00 AM',
                    requestedPersons: 1
                }
            });
            
            console.log('Availability for 1 person (before):', availBefore.data);
        } catch (error) {
            console.log('❌ Availability check failed (expected):', error.response?.data?.message || error.message);
        }
        
        // Step 3: Make first booking if slot is empty
        if (initialSlot8AM.bookedCount === 0) {
            console.log(`\n3️⃣ Making first booking with ${initialSlot8AM.currentMinimum} persons...`);
            
            const bookingResponse = await axios.put(`${BASE_URL}/api/timeslots/booking`, {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr,
                time: '8:00 AM',
                personsCount: initialSlot8AM.currentMinimum,
                operation: 'add'
            });
            
            console.log('✅ Booking successful:', bookingResponse.data);
            
            // Step 4: Check slot state AFTER booking
            console.log('\n4️⃣ Checking slot state AFTER first booking...');
            const afterResponse = await axios.get(`${BASE_URL}/api/timeslots/available`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr
                }
            });
            
            const afterSlots = afterResponse.data.slots;
            const afterSlot8AM = afterSlots?.find(s => s.time === '8:00 AM');
            
            console.log('8:00 AM slot AFTER first booking:', {
                bookedCount: afterSlot8AM.bookedCount,
                minimumPerson: afterSlot8AM.minimumPerson,
                currentMinimum: afterSlot8AM.currentMinimum,
                capacity: afterSlot8AM.capacity,
                isAvailable: afterSlot8AM.isAvailable
            });
            
            // Step 5: Test availability for 1 person AFTER first booking
            console.log('\n5️⃣ Testing availability for 1 person AFTER first booking...');
            try {
                const availAfter = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                    params: {
                        packageType: 'tour',
                        packageId: testTourId,
                        date: tomorrowStr,
                        time: '8:00 AM',
                        requestedPersons: 1
                    }
                });
                
                console.log('✅ Availability for 1 person (after):', availAfter.data);
            } catch (error) {
                console.log('❌ Availability check failed:', error.response?.data?.message || error.message);
            }
            
            // Step 6: Verification
            console.log('\n6️⃣ VERIFICATION:');
            const isMinimumUpdated = afterSlot8AM.minimumPerson === 1;
            const isCurrentMinimumUpdated = afterSlot8AM.currentMinimum === 1;
            
            if (isMinimumUpdated && isCurrentMinimumUpdated) {
                console.log('🎉 SUCCESS: minimumPerson logic is working correctly!');
                console.log('✅ minimumPerson field updated to 1');
                console.log('✅ currentMinimum field updated to 1');
            } else {
                console.log('❌ FAILED: minimumPerson logic is NOT working');
                console.log(`❌ minimumPerson should be 1, but is ${afterSlot8AM.minimumPerson}`);
                console.log(`❌ currentMinimum should be 1, but is ${afterSlot8AM.currentMinimum}`);
            }
            
        } else {
            console.log('\n⚠️ Slot already has bookings. Testing subsequent booking logic...');
            
            // Test availability for 1 person on a slot that already has bookings
            console.log('Testing availability for 1 person on occupied slot...');
            try {
                const availOccupied = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                    params: {
                        packageType: 'tour',
                        packageId: testTourId,
                        date: tomorrowStr,
                        time: '8:00 AM',
                        requestedPersons: 1
                    }
                });
                
                console.log('Availability for 1 person (occupied slot):', availOccupied.data);
                
                if (availOccupied.data.available) {
                    console.log('✅ SUCCESS: 1 person booking allowed on occupied slot');
                } else {
                    console.log('❌ FAILED: 1 person booking should be allowed on occupied slot');
                }
                
            } catch (error) {
                console.log('❌ Availability check failed:', error.response?.data?.message || error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
        console.error('Stack:', error.stack);
    }
}

// Check if server is reachable first
async function checkServer() {
    try {
        const response = await axios.get(`${BASE_URL}/api/timeslots/server-datetime`);
        console.log('✅ Server is reachable:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Server not reachable. Make sure server is running on port 3002');
        console.log('Error:', error.message);
        return false;
    }
}

// Run the test
async function runTest() {
    const serverReachable = await checkServer();
    if (serverReachable) {
        await completeMinimumPersonTest();
    }
}

runTest();
