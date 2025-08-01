const axios = require('axios');

const BASE_URL = 'http://192.168.163.50:3002';

// Test data
const testTourId = '688b17c82c56c0342c651be5'; // The existing tour ID from the API
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

async function testMinimumPersonLogic() {
    try {
        console.log('🧪 Testing Minimum Person Logic via API\n');
        
        // 1. Check available slots before any booking
        console.log('1. Checking available slots before any booking...');
        const slotsResponse = await axios.get(`${BASE_URL}/api/timeslots/available`, {
            params: {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr
            }
        });
        
        const slots = slotsResponse.data.slots;
        const slot8AM = slots?.find(s => s.time === '8:00 AM');
        
        console.log('8:00 AM slot before booking:', {
            time: slot8AM?.time,
            bookedCount: slot8AM?.bookedCount,
            minimumPerson: slot8AM?.minimumPerson,
            currentMinimum: slot8AM?.currentMinimum,
            isAvailable: slot8AM?.isAvailable
        });
        
        // 2. Test availability check for 1 person (should be denied initially)
        console.log('\n2. Testing availability for 1 person (should be denied)...');
        try {
            const availabilityResponse = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr,
                    time: '8:00 AM',
                    requestedPersons: 1
                }
            });
            
            console.log('Availability for 1 person:', availabilityResponse.data);
        } catch (error) {
            console.log('Availability check failed:', error.response?.data || error.message);
        }
        
        // 3. Test availability check for minimum required persons
        console.log('\n3. Testing availability for required minimum persons...');
        try {
            const availabilityResponse = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr,
                    time: '8:00 AM',
                    requestedPersons: slot8AM?.currentMinimum || 2
                }
            });
            
            console.log('Availability for minimum persons:', availabilityResponse.data);
        } catch (error) {
            console.log('Availability check failed:', error.response?.data || error.message);
        }
        
        // 4. Make a booking (simulate first booking)
        console.log('\n4. Making first booking...');
        try {
            const bookingResponse = await axios.put(`${BASE_URL}/api/timeslots/booking`, {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr,
                time: '8:00 AM',
                personsCount: slot8AM?.currentMinimum || 2,
                operation: 'add'
            });
            
            console.log('Booking result:', bookingResponse.data);
        } catch (error) {
            console.log('Booking failed:', error.response?.data || error.message);
        }
        
        // 5. Check slots after booking
        console.log('\n5. Checking available slots after first booking...');
        const slotsAfterResponse = await axios.get(`${BASE_URL}/api/timeslots/available`, {
            params: {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr
            }
        });
        
        const slotsAfter = slotsAfterResponse.data.slots;
        const slot8AMAfter = slotsAfter?.find(s => s.time === '8:00 AM');
        
        console.log('8:00 AM slot after booking:', {
            time: slot8AMAfter?.time,
            bookedCount: slot8AMAfter?.bookedCount,
            minimumPerson: slot8AMAfter?.minimumPerson,
            currentMinimum: slot8AMAfter?.currentMinimum,
            isAvailable: slot8AMAfter?.isAvailable
        });
        
        // 6. Test availability for 1 person after first booking (should be allowed now)
        console.log('\n6. Testing availability for 1 person after first booking (should be allowed)...');
        try {
            const availabilityAfterResponse = await axios.get(`${BASE_URL}/api/timeslots/availability`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr,
                    time: '8:00 AM',
                    requestedPersons: 1
                }
            });
            
            console.log('Availability for 1 person after first booking:', availabilityAfterResponse.data);
        } catch (error) {
            console.log('Availability check failed:', error.response?.data || error.message);
        }
        
        console.log('\n🎉 Test completed!');
        console.log('\n📋 Expected Results:');
        console.log('- Before first booking: minimumPerson should be > 1, currentMinimum should be > 1');
        console.log('- After first booking: minimumPerson should be 1, currentMinimum should be 1');
        console.log('- Booking 1 person should be denied before first booking');
        console.log('- Booking 1 person should be allowed after first booking');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Wait a moment for server to be ready, then run test
setTimeout(testMinimumPersonLogic, 3000);
