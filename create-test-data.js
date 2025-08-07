const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Define User Schema (client version for compatibility)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  image: String,
  location: String,
  bio: String,
  address: {
    whatsapp: String,
    phone: String,
    pickupAddresses: [String],
  },
  bookings: [String],
  provider: String,
  googleId: String,
}, { timestamps: true });

// Define Cart Schema (client version for compatibility)
const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  items: [{
    type: { type: String, enum: ['tour', 'transfer'] },
    itemId: String,
    selectedDate: String,
    timeSlot: String,
    guests: Number,
    pickupLocation: {
      name: String,
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    totalPrice: Number,
  }],
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Cart = mongoose.model('Cart', CartSchema);

async function createTestData() {
  try {
    console.log('=== CREATING TEST DATA ===');
    
    // Create a test user
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: '$2a$10$hash', // Mock hash
      image: '',
      location: 'Kuala Lumpur',
      bio: 'Test user for cart booking',
      address: {
        whatsapp: '+60123456789',
        phone: '+60123456789',
        pickupAddresses: ['KLCC', 'KL Sentral'],
      },
      bookings: [],
      provider: 'credentials',
    };

    // Check if user already exists
    let existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email);
    } else {
      existingUser = await User.create(testUser);
      console.log('✅ Created test user:', existingUser.email);
    }

    // Create a test cart
    const testCartItems = [
      {
        type: 'tour',
        itemId: '507f1f77bcf86cd799439011', // Mock tour ID
        selectedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeSlot: '09:00',
        guests: 2,
        pickupLocation: {
          name: 'KLCC',
          address: 'Kuala Lumpur Convention Centre',
          coordinates: {
            lat: 3.1583,
            lng: 101.7116,
          },
        },
        totalPrice: 200,
      },
      {
        type: 'transfer',
        itemId: '507f1f77bcf86cd799439012', // Mock transfer ID
        selectedDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        timeSlot: '14:00',
        guests: 2,
        pickupLocation: {
          name: 'KL Sentral',
          address: 'KL Sentral Station',
          coordinates: {
            lat: 3.1340,
            lng: 101.6863,
          },
        },
        totalPrice: 150,
      },
    ];

    // Check if cart already exists
    let existingCart = await Cart.findOne({ userId: existingUser._id });
    if (existingCart) {
      console.log('✅ Test cart already exists with', existingCart.items.length, 'items');
      // Update cart items to ensure fresh data
      existingCart.items = testCartItems;
      await existingCart.save();
      console.log('✅ Updated cart with fresh test items');
    } else {
      existingCart = await Cart.create({
        userId: existingUser._id,
        userEmail: existingUser.email,
        items: testCartItems,
      });
      console.log('✅ Created test cart with', existingCart.items.length, 'items');
    }

    console.log('\n📋 Test Data Summary:');
    console.log(`User ID: ${existingUser._id}`);
    console.log(`User Email: ${existingUser.email}`);
    console.log(`Cart ID: ${existingCart._id}`);
    console.log(`Cart Items: ${existingCart.items.length}`);
    
    existingCart.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}: ${item.type} - ${item.itemId} - ${item.selectedDate}`);
    });

    console.log('\n🔧 Test Cart Booking Lookup:');
    
    // Test the exact lookup that cart booking service uses
    const userLookup = await User.findOne({ email: existingUser.email });
    console.log(`User found by email: ${userLookup ? 'YES' : 'NO'}`);
    
    if (userLookup) {
      const cartLookup = await Cart.findOne({ userId: userLookup._id });
      console.log(`Cart found by userId: ${cartLookup ? 'YES' : 'NO'}`);
      
      if (cartLookup) {
        console.log(`Cart has ${cartLookup.items.length} items`);
        console.log('✅ Cart booking should work now!');
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Login with email: test@example.com');
    console.log('2. Go to cart page - should show 2 items');
    console.log('3. Proceed to booking - should work without "User not found" error');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestData();
