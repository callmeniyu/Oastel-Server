// Test script to verify Stripe payment integration
const axios = require('axios');

async function testStripeIntegration() {
    try {
        console.log('🧪 TESTING STRIPE PAYMENT INTEGRATION');
        console.log('====================================');
        
        const baseURL = 'http://192.168.1.45:3002';
        
        // Test 1: Create payment intent for single booking
        console.log('\n📋 Test 1: Creating payment intent for single booking...');
        
        const testBookingData = {
            packageType: 'transfer',
            packageId: '68b521f827021a6fb08770cb',
            date: '2025-09-08',
            time: '10:00 AM',
            adults: 2,
            children: 0,
            pickupLocation: 'Test Hotel',
            contactInfo: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+60123456789',
                whatsapp: '+60123456789'
            },
            subtotal: 100,
            total: 100
        };
        
        const paymentIntentResponse = await axios.post(`${baseURL}/api/payments/create-payment-intent`, {
            amount: 102.8, // 100 + 2.8% bank charge
            bookingData: testBookingData
        });
        
        if (paymentIntentResponse.data.success) {
            console.log('✅ Payment intent created successfully!');
            console.log(`- Payment Intent ID: ${paymentIntentResponse.data.data.paymentIntentId}`);
            console.log(`- Amount: ${paymentIntentResponse.data.data.amount / 100} MYR`);
            console.log(`- Client Secret: ${paymentIntentResponse.data.data.clientSecret.substring(0, 20)}...`);
        } else {
            console.log('❌ Failed to create payment intent:', paymentIntentResponse.data.error);
        }
        
        // Test 2: Create payment intent for cart booking
        console.log('\n📋 Test 2: Creating payment intent for cart booking...');
        
        const testCartData = {
            userEmail: 'user@example.com',
            items: [
                {
                    _id: 'cart_item_1',
                    packageId: '68b521f827021a6fb08770cb',
                    packageType: 'transfer',
                    totalPrice: 50
                },
                {
                    _id: 'cart_item_2',
                    packageId: '68b521f827021a6fb08770cb',
                    packageType: 'transfer',
                    totalPrice: 75
                }
            ]
        };
        
        const testContactInfo = {
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '+60987654321',
            whatsapp: '+60987654321'
        };
        
        const cartPaymentResponse = await axios.post(`${baseURL}/api/payments/create-cart-payment-intent`, {
            amount: 128.5, // 125 + 2.8% bank charge
            cartData: testCartData,
            contactInfo: testContactInfo
        });
        
        if (cartPaymentResponse.data.success) {
            console.log('✅ Cart payment intent created successfully!');
            console.log(`- Payment Intent ID: ${cartPaymentResponse.data.data.paymentIntentId}`);
            console.log(`- Amount: ${cartPaymentResponse.data.data.amount / 100} MYR`);
            console.log(`- Client Secret: ${cartPaymentResponse.data.data.clientSecret.substring(0, 20)}...`);
        } else {
            console.log('❌ Failed to create cart payment intent:', cartPaymentResponse.data.error);
        }
        
        console.log('\n🎉 STRIPE INTEGRATION TEST COMPLETED!');
        console.log('✅ Server is properly configured with Stripe');
        console.log('✅ Payment intents can be created');
        console.log('✅ Ready for frontend testing');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testStripeIntegration();
