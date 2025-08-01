const axios = require('axios');

const BASE_URL = 'http://192.168.163.50:3002';
const testTourId = '688b17c82c56c0342c651be5';

// Use tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

async function simpleTest() {
    try {
        console.log('🧪 Simple Minimum Person Test\n');
        
        console.log('1. Getting available slots...');
        const response = await axios.get(`${BASE_URL}/api/timeslots/available`, {
            params: {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr
            }
        });
        
        const slots = response.data.slots;
        const slot8AM = slots?.find(s => s.time === '8:00 AM');
        
        if (!slot8AM) {
            console.log('❌ No 8:00 AM slot found');
            return;
        }
        
        console.log('8:00 AM slot BEFORE booking:', {
            bookedCount: slot8AM.bookedCount,
            minimumPerson: slot8AM.minimumPerson,
            currentMinimum: slot8AM.currentMinimum
        });
        
        // Make a booking if this is the first time
        if (slot8AM.bookedCount === 0) {
            console.log('\n2. Making first booking...');
            const bookingResult = await axios.put(`${BASE_URL}/api/timeslots/booking`, {
                packageType: 'tour',
                packageId: testTourId,
                date: tomorrowStr,
                time: '8:00 AM',
                personsCount: slot8AM.currentMinimum || 2,
                operation: 'add'
            });
            
            console.log('Booking successful:', bookingResult.data.success);
            
            // Check slots again
            console.log('\n3. Getting slots after booking...');
            const afterResponse = await axios.get(`${BASE_URL}/api/timeslots/available`, {
                params: {
                    packageType: 'tour',
                    packageId: testTourId,
                    date: tomorrowStr
                }
            });
            
            const slotsAfter = afterResponse.data.slots;
            const slot8AMAfter = slotsAfter?.find(s => s.time === '8:00 AM');
            
            console.log('8:00 AM slot AFTER booking:', {
                bookedCount: slot8AMAfter.bookedCount,
                minimumPerson: slot8AMAfter.minimumPerson,
                currentMinimum: slot8AMAfter.currentMinimum
            });
            
            // Check if minimumPerson changed to 1
            if (slot8AMAfter.minimumPerson === 1 && slot8AMAfter.currentMinimum === 1) {
                console.log('\n✅ SUCCESS: minimumPerson correctly updated to 1!');
            } else {
                console.log('\n❌ FAILED: minimumPerson should be 1 but is', slot8AMAfter.minimumPerson);
            }
        } else {
            console.log('\n⚠️  Slot already has bookings. Cannot test first booking logic.');
            console.log('Consider clearing the slot or using a different date.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run test
simpleTest();
