const mongoose = require('mongoose');
require('dotenv').config();

const BookingSchema = new mongoose.Schema({
  date: Date,
  contactInfo: { name: String, email: String, phone: String }
}, { timestamps: true, strict: false });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
  
  // Find the specific booking
  const booking = await Booking.findOne({ 
    'contactInfo.email': 'jarodaidanschoeman@gmail.com'
  });
  
  if (!booking) {
    console.log('❌ Booking not found');
    process.exit(1);
  }
  
  console.log('📋 Current booking details:');
  console.log('Full ID:', booking._id.toString());
  console.log('Current date:', booking.date);
  console.log('Current date ISO:', new Date(booking.date).toISOString());
  console.log('Malaysia timezone:', new Date(booking.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
  
  // Set it to Jan 20, 2026 at noon Malaysia time (4 AM UTC)
  const correctDate = new Date(Date.UTC(2026, 0, 20, 4, 0, 0));
  console.log('\n🔧 Setting to Jan 20, 2026:');
  console.log('New date ISO:', correctDate.toISOString());
  console.log('Malaysia timezone:', correctDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }));
  
  booking.date = correctDate;
  await booking.save();
  
  console.log('\n✅ Updated successfully!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
