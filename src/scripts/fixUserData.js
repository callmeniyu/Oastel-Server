const mongoose = require('mongoose');
require('dotenv').config();

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  image: { type: String },
  location: { type: String },
  bio: { type: String },
  address: {
    whatsapp: String,
    phone: String,
    pickupAddresses: [String],
  },
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  provider: { type: String },
  googleId: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function fixUserData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users with invalid cartId or bookings
    const usersToFix = await User.find({
      $or: [
        { cartId: "" },
        { cartId: null },
        { bookings: "" },
        { bookings: null },
        { "bookings.0": "" }
      ]
    });

    console.log(`Found ${usersToFix.length} users with invalid data`);

    for (const user of usersToFix) {
      const updateFields = {};

      // Fix cartId
      if (user.cartId === "" || user.cartId === null) {
        updateFields.cartId = undefined;
      }

      // Fix bookings
      if (user.bookings === "" || user.bookings === null) {
        updateFields.bookings = [];
      } else if (Array.isArray(user.bookings)) {
        const validBookings = user.bookings.filter(booking => booking && booking !== "");
        if (validBookings.length !== user.bookings.length) {
          updateFields.bookings = validBookings;
        }
      }

      if (Object.keys(updateFields).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updateFields });
        console.log(`Fixed user: ${user.email}`);
      }
    }

    console.log('User data cleanup completed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error fixing user data:', error);
    process.exit(1);
  }
}

fixUserData();
