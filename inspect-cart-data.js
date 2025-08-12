const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Define schemas
const CartSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

const Cart = mongoose.model('Cart', CartSchema);
const User = mongoose.model('User', UserSchema);

async function inspectRealCartData() {
  try {
    console.log('=== INSPECTING REAL CART DATA ===');
    
    // Find users with carts
    const carts = await Cart.find({}).populate('userId');
    console.log(`\n📋 Found ${carts.length} carts in database`);
    
    for (let i = 0; i < carts.length; i++) {
      const cart = carts[i];
      console.log(`\n🛒 Cart ${i + 1}:`);
      console.log(`   User ID: ${cart.userId}`);
      console.log(`   Items: ${cart.items ? cart.items.length : 0}`);
      
      if (cart.items && cart.items.length > 0) {
        cart.items.forEach((item, index) => {
          console.log(`\n   📦 Item ${index + 1}:`);
          console.log(`      Package ID: ${item.packageId}`);
          console.log(`      Package Type: ${item.packageType}`);
          console.log(`      Package Title: ${item.packageTitle}`);
          console.log(`      Selected Date: ${item.selectedDate}`);
          console.log(`      Selected Time: ${item.selectedTime}`);
          console.log(`      Adults: ${item.adults}`);
          console.log(`      Children: ${item.children}`);
          console.log(`      Pickup Location: "${item.pickupLocation}"`);
          console.log(`      Total Price: ${item.totalPrice}`);
          
          // Check for any missing required fields
          const requiredFields = ['packageId', 'packageType', 'selectedDate', 'selectedTime', 'adults'];
          const missingFields = requiredFields.filter(field => !item[field] && item[field] !== 0);
          if (missingFields.length > 0) {
            console.log(`      ❌ Missing fields: ${missingFields.join(', ')}`);
          }
          
          // Check pickup location specifically
          if (item.pickupLocation === undefined || item.pickupLocation === null) {
            console.log(`      ⚠️  Pickup location is undefined/null`);
          } else if (item.pickupLocation === '') {
            console.log(`      ⚠️  Pickup location is empty string`);
          }
        });
      }
      
      // If this cart has the failing user, let's check their email
      if (cart.userId) {
        const user = await User.findById(cart.userId);
        if (user) {
          console.log(`   👤 User Email: ${user.email}`);
          console.log(`   👤 User Name: ${user.name}`);
        }
      }
    }
    
    console.log('\n🔍 Analysis:');
    console.log('Looking for common issues that could cause booking failures...');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

inspectRealCartData();
