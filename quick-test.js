// Quick test to run the MongoDB operations directly
const mongoose = require('mongoose');
require('dotenv').config();

async function quickTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test if we can find any collections
    const collections = await mongoose.connection.db.collections();
    console.log('📋 Available collections:', collections.map(c => c.collectionName));
    
    // Test basic user query
    const users = await mongoose.connection.db.collection('users').findOne();
    console.log('👤 Sample user:', users ? 'Found' : 'Not found');
    
    // Test basic cart query
    const carts = await mongoose.connection.db.collection('carts').findOne();
    console.log('🛒 Sample cart:', carts ? JSON.stringify(carts, null, 2) : 'Not found');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickTest();
