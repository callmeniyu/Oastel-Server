require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const User = require('../dist/models/User').default;

async function fixUserIdAssignments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('🔧 FIXING USER ID ASSIGNMENTS');
    console.log('===============================');

    // Get all bookings without User ID that have succeeded payments
    const bookingsWithoutUserId = await Booking.find({
      $and: [
        {
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { 'paymentInfo.paymentStatus': 'succeeded' }
      ]
    }).sort({ createdAt: -1 });

    console.log(`Found ${bookingsWithoutUserId.length} succeeded bookings without User ID`);

    let usersCreated = 0;
    let usersLinked = 0;
    let errors = 0;

    for (const booking of bookingsWithoutUserId) {
      try {
        console.log(`\nProcessing booking ${booking._id} for ${booking.contactInfo.email}`);

        // Check if user already exists
        let user = await User.findOne({ email: booking.contactInfo.email });

        if (!user) {
          // Create new user
          console.log(`  Creating new user for ${booking.contactInfo.email}`);
          user = new User({
            name: booking.contactInfo.name,
            email: booking.contactInfo.email,
            phone: booking.contactInfo.phone,
            role: 'user',
            isVerified: true, // Mark as verified since they made a successful booking
            createdAt: booking.createdAt // Use booking creation date
          });
          
          await user.save();
          usersCreated++;
          console.log(`  ✅ User created with ID: ${user._id}`);
        } else {
          console.log(`  👤 User already exists with ID: ${user._id}`);
        }

        // Link booking to user
        await Booking.findByIdAndUpdate(booking._id, {
          userId: user._id,
          updatedAt: new Date()
        });

        usersLinked++;
        console.log(`  🔗 Booking linked to user`);

      } catch (error) {
        console.error(`  ❌ Error processing booking ${booking._id}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`👥 Users created: ${usersCreated}`);
    console.log(`🔗 Bookings linked: ${usersLinked}`);
    console.log(`❌ Errors: ${errors}`);

    // Verify the fix
    const remainingBookingsWithoutUserId = await Booking.countDocuments({
      $and: [
        {
          $or: [
            { userId: { $exists: false } },
            { userId: null }
          ]
        },
        { 'paymentInfo.paymentStatus': 'succeeded' }
      ]
    });

    console.log(`\n✅ Remaining succeeded bookings without User ID: ${remainingBookingsWithoutUserId}`);

    if (remainingBookingsWithoutUserId === 0) {
      console.log('🎉 All succeeded bookings now have User IDs!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixUserIdAssignments();