const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Import the actual models
const CartSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });
const BookingSchema = new mongoose.Schema({}, { strict: false });

const Cart = mongoose.model('Cart', CartSchema);
const User = mongoose.model('User', UserSchema);
const Booking = mongoose.model('Booking', BookingSchema);

async function debugBookingCreation() {
  try {
    console.log('=== DEBUGGING BOOKING CREATION ===');
    
    // Find a user with cart items
    const carts = await Cart.find({}).populate('userId');
    if (carts.length === 0) {
      console.log('❌ No carts found in database');
      return;
    }
    
    const cart = carts[0]; // Take the first cart
    if (!cart.items || cart.items.length === 0) {
      console.log('❌ Cart has no items');
      return;
    }
    
    const user = await User.findById(cart.userId);
    if (!user) {
      console.log('❌ User not found for cart');
      return;
    }
    
    console.log(`👤 Testing with user: ${user.email}`);
    console.log(`🛒 Cart has ${cart.items.length} items`);
    
    // Test creating a booking manually for the first cart item
    const item = cart.items[0];
    console.log(`\n📦 Testing booking creation for: ${item.packageTitle}`);
    
    // Log all the item fields
    console.log('Item data:');
    Object.keys(item.toObject()).forEach(key => {
      console.log(`  ${key}: ${item[key]} (${typeof item[key]})`);
    });
    
    // Try to create a booking with the same data structure as the service
    const bookingData = {
      userId: user._id,
      packageType: item.packageType,
      packageId: item.packageId,
      date: item.selectedDate,
      time: item.selectedTime,
      adults: item.adults || 1, // Default to 1 if missing
      children: item.children || 0, // Default to 0 if missing
      pickupLocation: item.pickupLocation || 'Not specified', // Ensure not empty
      status: 'pending',
      firstBookingMinimum: false,
      contactInfo: {
        name: user.name || 'Test User',
        email: user.email,
        phone: user.address?.phone || '+60123456789',
        whatsapp: user.address?.whatsapp || user.address?.phone || '+60123456789'
      },
      paymentInfo: {
        paymentStatus: 'pending',
        amount: item.totalPrice || 100,
        bankCharge: (item.totalPrice || 100) * 0.028,
        currency: 'MYR',
        refundStatus: 'none'
      },
      subtotal: item.totalPrice || 100,
      total: (item.totalPrice || 100) + ((item.totalPrice || 100) * 0.028)
    };
    
    console.log('\n📝 Booking data structure:');
    console.log(JSON.stringify(bookingData, null, 2));
    
    // Try to create and validate the booking
    try {
      const testBooking = new Booking(bookingData);
      
      // Check for validation errors without saving
      const validationError = testBooking.validateSync();
      if (validationError) {
        console.log('\n❌ Validation errors:');
        Object.keys(validationError.errors).forEach(field => {
          console.log(`  ${field}: ${validationError.errors[field].message}`);
        });
      } else {
        console.log('\n✅ Booking validation passed!');
        
        // Try to save it
        const savedBooking = await testBooking.save();
        console.log(`✅ Booking saved successfully with ID: ${savedBooking._id}`);
        
        // Clean up - delete the test booking
        await Booking.findByIdAndDelete(savedBooking._id);
        console.log('🧹 Test booking cleaned up');
      }
      
    } catch (saveError) {
      console.log('\n❌ Error during booking save:');
      console.log(`Error name: ${saveError.name}`);
      console.log(`Error message: ${saveError.message}`);
      
      if (saveError.name === 'ValidationError') {
        console.log('Validation errors:');
        Object.keys(saveError.errors).forEach(field => {
          console.log(`  ${field}: ${saveError.errors[field].message}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugBookingCreation();
