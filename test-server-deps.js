const express = require('express');

// Simple test to verify server dependencies
async function testServerDependencies() {
  try {
    console.log('🔍 Testing server dependencies...');
    
    // Test basic imports
    const mongoose = require('mongoose');
    console.log('✅ Mongoose imported');
    
    const cors = require('cors');
    console.log('✅ CORS imported');
    
    const dotenv = require('dotenv');
    console.log('✅ Dotenv imported');
    
    // Test environment variables
    dotenv.config();
    
    if (process.env.MONGODB_URI) {
      console.log('✅ MongoDB URI found');
    } else {
      console.log('⚠️  MongoDB URI not found in .env');
    }
    
    if (process.env.PORT) {
      console.log(`✅ Port configured: ${process.env.PORT}`);
    } else {
      console.log('✅ Using default port 3002');
    }
    
    // Test basic express setup
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.get('/test', (req, res) => {
      res.json({ success: true, message: 'Server test endpoint working' });
    });
    
    const server = app.listen(3003, () => {
      console.log('✅ Express server can start successfully');
      server.close();
      console.log('✅ All server dependencies OK!');
    });
    
  } catch (error) {
    console.error('❌ Server dependency error:', error.message);
  }
}

testServerDependencies();
