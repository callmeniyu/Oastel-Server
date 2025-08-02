// Test script to verify password change functionality
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import our User model (will need to adjust path as needed)
const User = require('./src/models/User');

async function testPasswordChange() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test user
    const testEmail = 'test@example.com'; // You can change this to an actual user email
    console.log(`🔍 Looking for user with email: ${testEmail}`);
    
    let user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('👤 User not found, creating test user...');
      // Create a test user
      user = new User({
        name: 'Test User',
        email: testEmail,
        passwordHash: '', // No password initially
        bookings: [],
        image: 'https://via.placeholder.com/150'
      });
      await user.save();
      console.log('✅ Test user created');
    }

    console.log('📋 User before password change:');
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Has password: ${user.passwordHash && user.passwordHash.length > 0}`);
    console.log(`  - Password hash length: ${user.passwordHash ? user.passwordHash.length : 0}`);

    // Test our service function
    const { changeUserPassword } = require('./src/services/user.service');
    
    console.log('🔐 Testing password change...');
    const result = await changeUserPassword(testEmail, null, 'newpassword123');
    
    console.log('📋 Password change result:');
    console.log(`  - Success: ${result.success}`);
    console.log(`  - Message: ${result.message}`);

    if (result.success) {
      // Verify the password was actually saved
      const updatedUser = await User.findOne({ email: testEmail });
      console.log('📋 User after password change:');
      console.log(`  - Has password: ${updatedUser.passwordHash && updatedUser.passwordHash.length > 0}`);
      console.log(`  - Password hash length: ${updatedUser.passwordHash ? updatedUser.passwordHash.length : 0}`);
      
      // Test if the password is correct
      const isValidPassword = await bcrypt.compare('newpassword123', updatedUser.passwordHash);
      console.log(`  - Password verification: ${isValidPassword ? '✅ Correct' : '❌ Incorrect'}`);
    }

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

console.log('🚀 Starting password change test...');
testPasswordChange();
