const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Define schemas
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

async function debugSessionAndCart() {
  try {
    console.log('=== DEBUG SESSION AND CART ===');
    
    // List all users
    const users = await User.find({}).limit(5);
    console.log('\n📋 Users in database:');
    users.forEach(user => {
      console.log(`  - ID: ${user._id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.name || 'N/A'}`);
      console.log(`    Provider: ${user.provider || 'credentials'}`);
      console.log('    ---');
    });

    // List all carts
    const carts = await Cart.find({}).populate('userId');
    console.log('\n🛒 Carts in database:');
    carts.forEach(cart => {
      console.log(`  - Cart ID: ${cart._id}`);
      console.log(`    User ID: ${cart.userId}`);
      console.log(`    User Email: ${cart.userEmail}`);
      console.log(`    Items: ${cart.items.length}`);
      if (cart.userId) {
        console.log(`    User Name: ${cart.userId.name}`);
        console.log(`    User Email from User: ${cart.userId.email}`);
      }
      console.log('    ---');
    });

    // Test with a specific user - let's use the first user we find
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔍 Testing cart lookup for user: ${testUser.email}`);
      
      // Test finding user by email (like the cart booking service does)
      const foundUser = await User.findOne({ email: testUser.email });
      console.log(`  User found by email: ${foundUser ? 'YES' : 'NO'}`);
      
      if (foundUser) {
        console.log(`  Found user ID: ${foundUser._id}`);
        
        // Test finding cart by user ID
        const foundCart = await Cart.findOne({ userId: foundUser._id });
        console.log(`  Cart found by userId: ${foundCart ? 'YES' : 'NO'}`);
        
        if (foundCart) {
          console.log(`  Cart items count: ${foundCart.items.length}`);
          foundCart.items.forEach((item, index) => {
            console.log(`    Item ${index + 1}: ${item.type} - ${item.itemId} - ${item.selectedDate}`);
          });
        }
        
        // Also test finding cart by email
        const foundCartByEmail = await Cart.findOne({ userEmail: testUser.email });
        console.log(`  Cart found by userEmail: ${foundCartByEmail ? 'YES' : 'NO'}`);
      }
    }

    // Simulate the exact cart booking service lookup
    console.log('\n🔧 Simulating cart booking service lookup...');
    
    // Mock session data that would come from NextAuth
    const mockSession = {
      user: {
        email: users.length > 0 ? users[0].email : 'test@example.com',
        id: users.length > 0 ? users[0]._id.toString() : 'mock-id',
        name: users.length > 0 ? users[0].name : 'Test User'
      }
    };
    
    console.log(`Mock session: ${JSON.stringify(mockSession, null, 2)}`);
    
    // Try the exact lookup from cartBooking.service.ts
    const userByEmail = await User.findOne({ email: mockSession.user.email });
    console.log(`User lookup by email "${mockSession.user.email}": ${userByEmail ? 'FOUND' : 'NOT FOUND'}`);
    
    if (userByEmail) {
      const cartByUserId = await Cart.findOne({ userId: userByEmail._id });
      console.log(`Cart lookup by userId "${userByEmail._id}": ${cartByUserId ? 'FOUND' : 'NOT FOUND'}`);
      
      if (cartByUserId) {
        console.log(`Cart has ${cartByUserId.items.length} items`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugSessionAndCart();
