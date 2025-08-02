const mongoose = require('mongoose');
require('dotenv').config();

async function fixDatabase() {
  console.log('Starting database cleanup...');
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Find and fix all users with corrupted data
    const result = await collection.updateMany(
      {
        $or: [
          { cartId: '' },
          { cartId: null },
          { bookings: '' },
          { bookings: null },
          { bookings: "[ '' ]" },
          { 'bookings.0': '' },
          { 'bookings.0': null }
        ]
      },
      [
        {
          $set: {
            bookings: [],
            cartId: null
          }
        }
      ]
    );
    
    console.log('Fixed', result.modifiedCount, 'users');
    
    // Remove null cartId fields
    const unsetResult = await collection.updateMany(
      { cartId: null },
      { $unset: { cartId: 1 } }
    );
    
    console.log('Removed cartId from', unsetResult.modifiedCount, 'users');
    
    // Show remaining users with any potential issues
    const problematicUsers = await collection.find({
      $or: [
        { cartId: { $exists: true, $type: 'string' } },
        { bookings: { $type: 'string' } },
        { bookings: { $elemMatch: { $type: 'string' } } }
      ]
    }).toArray();
    
    console.log('Remaining problematic users:', problematicUsers.length);
    if (problematicUsers.length > 0) {
      console.log('Sample problematic user:', problematicUsers[0]);
    }
    
    await mongoose.connection.close();
    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDatabase().catch(console.error);
