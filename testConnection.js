const mongoose = require('mongoose');
require('dotenv').config();

console.log('Script starting...');

async function testConnection() {
  try {
    console.log('Attempting connection...');
    console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');
    
    const db = mongoose.connection.db;
    const usersCount = await db.collection('users').countDocuments();
    console.log('Total users in database:', usersCount);
    
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

console.log('Calling testConnection...');
testConnection().then(() => console.log('Done')).catch(console.error);
