const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Define User Schema
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

// Define Cart Schema (server version)
const CartItemSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  packageType: {
    type: String,
    enum: ['tour', 'transfer'],
    required: true
  },
  packageTitle: {
    type: String,
    required: true
  },
  packageImage: {
    type: String,
    required: true
  },
  packagePrice: {
    type: Number,
    required: true
  },
  selectedDate: {
    type: Date,
    required: true
  },
  selectedTime: {
    type: String,
    required: true
  },
  adults: {
    type: Number,
    required: true
  },
  children: {
    type: Number,
    default: 0
  },
  pickupLocation: {
    type: String,
    default: ''
  },
  totalPrice: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [CartItemSchema],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Cart = mongoose.model('Cart', CartSchema);

async function setupTestDataAndTest() {
  try {
    console.log('=== COMPREHENSIVE CART BOOKING TEST ===');
    
    // Step 1: Create test user
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: '$2a$10$hash',
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

    let existingUser = await User.findOne({ email: testUser.email });
    if (!existingUser) {
      existingUser = await User.create(testUser);
      console.log('✅ Created test user:', existingUser.email);
    } else {
      console.log('✅ Test user already exists:', existingUser.email);
    }

    // Step 2: Create test cart with proper server structure
    const testCartItems = [
      {
        packageId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        packageType: 'tour',
        packageTitle: 'Intimate Group Adventure',
        packageImage: '/images/tour-sample.jpg',
        packagePrice: 100,
        selectedDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        selectedTime: '09:00',
        adults: 2,
        children: 0,
        pickupLocation: 'KLCC',
        totalPrice: 200,
        addedAt: new Date()
      }
    ];

    let existingCart = await Cart.findOne({ userId: existingUser._id });
    if (existingCart) {
      existingCart.items = testCartItems;
      existingCart.totalAmount = testCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await existingCart.save();
      console.log('✅ Updated test cart');
    } else {
      const totalAmount = testCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      existingCart = await Cart.create({
        userId: existingUser._id,
        items: testCartItems,
        totalAmount: totalAmount,
      });
      console.log('✅ Created test cart');
    }

    console.log(`📋 Test data ready - User: ${existingUser.email}, Cart items: ${existingCart.items.length}`);

    // Step 3: Test the cart booking API
    console.log('\n🧪 Testing cart booking API...');
    
    const bookingRequest = {
      userEmail: existingUser.email,
      contactInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+60123456789',
        whatsapp: '+60123456789'
      }
    };

    console.log('Request payload:', JSON.stringify(bookingRequest, null, 2));

    // Wait a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch('http://localhost:5000/api/cart-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingRequest)
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (response.ok) {
        console.log('✅ Cart booking API test PASSED!');
        try {
          const jsonResponse = JSON.parse(responseText);
          console.log('Parsed response:', JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
          console.log('Response is not JSON');
        }
      } else {
        console.log('❌ Cart booking API test FAILED');
        try {
          const errorResponse = JSON.parse(responseText);
          console.log('Error details:', JSON.stringify(errorResponse, null, 2));
          
          if (errorResponse.errors) {
            console.log('\n🔍 Error Analysis:');
            errorResponse.errors.forEach(error => {
              console.log(`- ${error}`);
            });
          }
        } catch (e) {
          console.log('Error response is not JSON');
        }
      }

    } catch (fetchError) {
      if (fetchError.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on localhost:5000');
        console.log('💡 Please start the server first: npm run dev');
      } else {
        console.error('❌ Fetch error:', fetchError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

setupTestDataAndTest();
