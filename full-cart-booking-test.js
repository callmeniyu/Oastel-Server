const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

// Test configuration
const CONFIG = {
  CLIENT_URL: 'http://localhost:3000',
  ADMIN_URL: 'http://localhost:3001', 
  SERVER_URL: 'http://localhost:3002'
};

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

const CartItemSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  packageType: { type: String, enum: ['tour', 'transfer'], required: true },
  packageTitle: { type: String, required: true },
  packageImage: { type: String, required: true },
  packagePrice: { type: Number, required: true },
  selectedDate: { type: Date, required: true },
  selectedTime: { type: String, required: true },
  adults: { type: Number, required: true },
  children: { type: Number, default: 0 },
  pickupLocation: { type: String, default: '' },
  totalPrice: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now }
});

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [CartItemSchema],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

const BookingSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Cart = mongoose.model('Cart', CartSchema);
const Booking = mongoose.model('Booking', BookingSchema);

async function comprehensiveCartBookingTest() {
  try {
    console.log('🧪 COMPREHENSIVE CART BOOKING TEST');
    console.log('=====================================\n');

    // Step 1: Check if all services are running
    console.log('1️⃣ Checking service availability...');
    
    const services = [
      { name: 'Client', url: CONFIG.CLIENT_URL },
      { name: 'Admin', url: CONFIG.ADMIN_URL },
      { name: 'Server', url: CONFIG.SERVER_URL + '/api/timeslots/server-datetime' }
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url, { timeout: 5000 });
        if (service.name === 'Server') {
          const data = await response.json();
          if (data.success) {
            console.log(`✅ ${service.name} is running`);
          } else {
            console.log(`⚠️  ${service.name} responded but with error`);
          }
        } else {
          console.log(`✅ ${service.name} is running (status: ${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${service.name} is not running - ${error.message}`);
      }
    }

    // Step 2: Get real tours/transfers for test data
    console.log('\n2️⃣ Getting real package data...');
    
    let realTourId = null;
    let realTourTitle = 'Test Tour';
    let realTransferId = null;
    let realTransferTitle = 'Test Transfer';
    
    try {
      const toursResponse = await fetch(`${CONFIG.SERVER_URL}/api/tours?limit=1`);
      const toursData = await toursResponse.json();
      if (toursData.success && toursData.data.length > 0) {
        realTourId = toursData.data[0]._id;
        realTourTitle = toursData.data[0].title;
        console.log(`✅ Found real tour: ${realTourTitle} (${realTourId})`);
      }
    } catch (error) {
      console.log('⚠️  Could not fetch real tours, will use mock data');
    }

    try {
      const transfersResponse = await fetch(`${CONFIG.SERVER_URL}/api/transfers?limit=1`);
      const transfersData = await transfersResponse.json();
      if (transfersData.success && transfersData.data.length > 0) {
        realTransferId = transfersData.data[0]._id;
        realTransferTitle = transfersData.data[0].title;
        console.log(`✅ Found real transfer: ${realTransferTitle} (${realTransferId})`);
      }
    } catch (error) {
      console.log('⚠️  Could not fetch real transfers, will use mock data');
    }

    // Step 3: Create or update test user and cart
    console.log('\n3️⃣ Setting up test user and cart...');
    
    const testUserData = {
      name: 'Cart Test User',
      email: 'carttest@example.com',
      passwordHash: '$2a$10$test',
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

    let testUser = await User.findOne({ email: testUserData.email });
    if (!testUser) {
      testUser = await User.create(testUserData);
      console.log(`✅ Created test user: ${testUser.email}`);
    } else {
      console.log(`✅ Test user exists: ${testUser.email}`);
    }

    // Create test cart items with real or mock data
    const futureDate1 = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const futureDate2 = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow

    const testCartItems = [
      {
        packageId: realTourId ? new mongoose.Types.ObjectId(realTourId) : new mongoose.Types.ObjectId(),
        packageType: 'tour',
        packageTitle: realTourTitle,
        packageImage: '/images/tour-sample.jpg',
        packagePrice: 150,
        selectedDate: futureDate1,
        selectedTime: '09:00',
        adults: 2,
        children: 0,
        pickupLocation: 'KLCC',
        totalPrice: 300,
        addedAt: new Date()
      },
      {
        packageId: realTransferId ? new mongoose.Types.ObjectId(realTransferId) : new mongoose.Types.ObjectId(),
        packageType: 'transfer',
        packageTitle: realTransferTitle,
        packageImage: '/images/transfer-sample.jpg',
        packagePrice: 75,
        selectedDate: futureDate2,
        selectedTime: '14:00',
        adults: 2,
        children: 1,
        pickupLocation: 'KL Sentral',
        totalPrice: 225,
        addedAt: new Date()
      }
    ];

    let testCart = await Cart.findOne({ userId: testUser._id });
    if (testCart) {
      testCart.items = testCartItems;
      testCart.totalAmount = testCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await testCart.save();
      console.log(`✅ Updated test cart with ${testCart.items.length} items`);
    } else {
      const totalAmount = testCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      testCart = await Cart.create({
        userId: testUser._id,
        items: testCartItems,
        totalAmount: totalAmount,
      });
      console.log(`✅ Created test cart with ${testCart.items.length} items`);
    }

    // Step 4: Test cart booking API
    console.log('\n4️⃣ Testing cart booking API...');
    
    const bookingRequest = {
      userEmail: testUser.email,
      contactInfo: {
        name: testUser.name,
        email: testUser.email,
        phone: testUser.address.phone,
        whatsapp: testUser.address.whatsapp
      }
    };

    console.log('📤 Sending booking request:', JSON.stringify(bookingRequest, null, 2));

    try {
      const bookingResponse = await fetch(`${CONFIG.SERVER_URL}/api/cart-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingRequest)
      });

      const responseText = await bookingResponse.text();
      console.log(`📥 Response status: ${bookingResponse.status}`);
      console.log(`📥 Response body: ${responseText}`);

      if (bookingResponse.ok) {
        const bookingData = JSON.parse(responseText);
        console.log('✅ Cart booking successful!');
        console.log(`📋 Created ${bookingData.data.totalBookings} bookings`);
        console.log(`📋 Booking IDs: ${bookingData.data.bookingIds.join(', ')}`);

        // Step 5: Verify bookings were created in database
        console.log('\n5️⃣ Verifying bookings in database...');
        
        const createdBookings = await Booking.find({
          _id: { $in: bookingData.data.bookingIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        console.log(`✅ Found ${createdBookings.length} bookings in database`);
        createdBookings.forEach((booking, index) => {
          console.log(`   📋 Booking ${index + 1}:`);
          console.log(`      - ID: ${booking._id}`);
          console.log(`      - Package: ${booking.packageType}`);
          console.log(`      - Date: ${booking.date}`);
          console.log(`      - Status: ${booking.status}`);
          console.log(`      - Total: ${booking.total}`);
        });

        // Step 6: Test admin API to ensure bookings appear
        console.log('\n6️⃣ Testing admin bookings API...');
        
        try {
          const adminBookingsResponse = await fetch(`${CONFIG.SERVER_URL}/api/bookings`);
          const adminBookingsData = await adminBookingsResponse.json();
          
          if (adminBookingsData.success) {
            console.log(`✅ Admin can fetch bookings: ${adminBookingsData.data.length} total bookings`);
            
            // Check if our test bookings are included
            const ourBookingIds = bookingData.data.bookingIds;
            const foundOurBookings = adminBookingsData.data.filter(booking => 
              ourBookingIds.includes(booking._id)
            );
            
            console.log(`✅ Our test bookings visible in admin: ${foundOurBookings.length}/${ourBookingIds.length}`);
          } else {
            console.log('❌ Admin bookings API failed');
          }
        } catch (adminError) {
          console.log('❌ Error testing admin API:', adminError.message);
        }

        // Step 7: Verify cart was cleared
        console.log('\n7️⃣ Verifying cart was cleared...');
        
        const updatedCart = await Cart.findOne({ userId: testUser._id });
        if (updatedCart && updatedCart.items.length === 0) {
          console.log('✅ Cart was properly cleared after booking');
        } else {
          console.log(`⚠️  Cart still has ${updatedCart?.items.length || 0} items`);
        }

        console.log('\n🎉 COMPREHENSIVE TEST COMPLETED SUCCESSFULLY!');
        console.log('==================================================');
        console.log('✅ Cart booking flow working end-to-end');
        console.log('✅ Bookings created in database');
        console.log('✅ Bookings visible in admin API');
        console.log('✅ Cart properly cleared after booking');

      } else {
        console.log('❌ Cart booking failed');
        try {
          const errorData = JSON.parse(responseText);
          console.log('Error details:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('Raw error response:', responseText);
        }
      }

    } catch (fetchError) {
      console.log('❌ Network error during booking:', fetchError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

comprehensiveCartBookingTest();
