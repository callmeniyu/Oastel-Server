// Simple DB check script
require('dotenv').config();
const mongoose = require('mongoose');

// DB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oastel_db';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        return checkTimeSlotData();
    })
    .catch(error => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

async function checkTimeSlotData() {
    try {
        const TimeSlot = mongoose.model('TimeSlot');
        
        // Use tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        console.log('\n🔍 Checking TimeSlot data for date:', tomorrowStr);
        
        const timeSlot = await TimeSlot.findOne({
            packageType: 'tour',
            packageId: new mongoose.Types.ObjectId('688b17c82c56c0342c651be5'),
            date: tomorrowStr
        });
        
        if (!timeSlot) {
            console.log('❌ No time slot found for tomorrow');
            process.exit(0);
        }
        
        console.log('\n📋 TimeSlot slots data:');
        timeSlot.slots.forEach(slot => {
            console.log(`${slot.time}: bookedCount=${slot.bookedCount}, minimumPerson=${slot.minimumPerson}, capacity=${slot.capacity}`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error checking data:', error);
        process.exit(1);
    }
}

// Define TimeSlot schema if not already defined
if (!mongoose.models.TimeSlot) {
    const { Schema } = mongoose;
    
    const TimeSlotSchema = new Schema({
        packageType: { type: String, enum: ["tour","transfer"], required: true },
        packageId: { type: Schema.Types.ObjectId, required: true },
        date: { type: String, required: true },
        slots: [{
            time: String,
            capacity: Number,
            bookedCount: { type: Number, default: 0 },
            isAvailable: { type: Boolean, default: true },
            minimumPerson: { type: Number, default: 1 },
            cutoffTime: { type: Date },
            price: { type: Number }
        }],
        isAvailable: { type: Boolean, default: true },
        booked: { type: Number, default: 0 },
        capacity: { type: Number, required: true },
        blackoutDate: { type: Boolean, default: false },
        cutoffHours: { type: Number, default: 10 }
    }, { timestamps: true });

    mongoose.model('TimeSlot', TimeSlotSchema);
}
