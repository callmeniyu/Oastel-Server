// Manual verification of minimum person logic by directly importing the service
require('dotenv').config();
const mongoose = require('mongoose');
const { TimeSlotService } = require('./src/services/timeSlot.service.ts');

// Mock the models
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oastel_db';

async function directServiceTest() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        const testTourId = '688b17c82c56c0342c651be5';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        console.log(`\n📅 Testing with date: ${tomorrowStr}`);
        console.log(`📦 Testing tour ID: ${testTourId}`);
        
        // 1. Check initial state
        console.log('\n1️⃣ Getting initial available slots...');
        const initialSlots = await TimeSlotService.getAvailableSlots(
            'tour',
            new mongoose.Types.ObjectId(testTourId),
            tomorrowStr
        );
        
        if (!initialSlots || initialSlots.length === 0) {
            console.log('❌ No slots found. Generating slots first...');
            // Need to generate slots - but we need the tour details first
            process.exit(1);
        }
        
        const slot8AM = initialSlots.find(s => s.time === '8:00 AM');
        if (!slot8AM) {
            console.log('❌ No 8:00 AM slot found');
            process.exit(1);
        }
        
        console.log('Initial 8:00 AM slot:', {
            bookedCount: slot8AM.bookedCount,
            minimumPerson: slot8AM.minimumPerson,
            currentMinimum: slot8AM.currentMinimum,
            capacity: slot8AM.capacity
        });
        
        // 2. Test availability check before booking
        console.log('\n2️⃣ Testing availability for 1 person (should fail)...');
        const availBefore = await TimeSlotService.checkAvailability(
            'tour',
            new mongoose.Types.ObjectId(testTourId),
            tomorrowStr,
            '8:00 AM',
            1
        );
        
        console.log('Availability before:', availBefore);
        
        // 3. Make first booking if slot is empty
        if (slot8AM.bookedCount === 0) {
            console.log(`\n3️⃣ Making first booking with ${slot8AM.currentMinimum} persons...`);
            
            const bookingResult = await TimeSlotService.updateSlotBooking(
                'tour',
                new mongoose.Types.ObjectId(testTourId),
                tomorrowStr,
                '8:00 AM',
                slot8AM.currentMinimum,
                'add'
            );
            
            console.log('Booking result:', bookingResult);
            
            // 4. Check state after booking
            console.log('\n4️⃣ Getting slots after booking...');
            const afterSlots = await TimeSlotService.getAvailableSlots(
                'tour',
                new mongoose.Types.ObjectId(testTourId),
                tomorrowStr
            );
            
            const slot8AMAfter = afterSlots.find(s => s.time === '8:00 AM');
            console.log('8:00 AM slot after booking:', {
                bookedCount: slot8AMAfter.bookedCount,
                minimumPerson: slot8AMAfter.minimumPerson,
                currentMinimum: slot8AMAfter.currentMinimum,
                capacity: slot8AMAfter.capacity
            });
            
            // 5. Test availability for 1 person after booking
            console.log('\n5️⃣ Testing availability for 1 person after booking (should pass)...');
            const availAfter = await TimeSlotService.checkAvailability(
                'tour',
                new mongoose.Types.ObjectId(testTourId),
                tomorrowStr,
                '8:00 AM',
                1
            );
            
            console.log('Availability after:', availAfter);
            
            // 6. Verification
            console.log('\n6️⃣ VERIFICATION:');
            if (slot8AMAfter.minimumPerson === 1 && slot8AMAfter.currentMinimum === 1) {
                console.log('🎉 SUCCESS: Minimum person logic is working!');
            } else {
                console.log('❌ FAILED: Minimum person logic is NOT working');
                console.log(`Expected minimumPerson=1, got ${slot8AMAfter.minimumPerson}`);
                console.log(`Expected currentMinimum=1, got ${slot8AMAfter.currentMinimum}`);
            }
        } else {
            console.log('\n⚠️ Slot already has bookings. Testing with occupied slot...');
            
            const availOccupied = await TimeSlotService.checkAvailability(
                'tour',
                new mongoose.Types.ObjectId(testTourId),
                tomorrowStr,
                '8:00 AM',
                1
            );
            
            console.log('Availability on occupied slot:', availOccupied);
            
            if (availOccupied.available) {
                console.log('✅ SUCCESS: 1 person booking allowed on occupied slot');
            } else {
                console.log('❌ FAILED: 1 person should be allowed on occupied slot');
            }
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

directServiceTest();
