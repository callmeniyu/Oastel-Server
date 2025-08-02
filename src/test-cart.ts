// Test script to verify cart functionality
import cartService from './services/cart.service';

async function testCartFunctionality() {
  try {
    console.log('🧪 Testing Cart Functionality...\n');

    const testEmail = 'test@example.com';
    const testPackageId = '507f1f77bcf86cd799439011'; // Sample ObjectId

    // Test 1: Get empty cart
    console.log('Test 1: Getting empty cart...');
    const emptyCart = await cartService.getCart(testEmail);
    console.log('✅ Empty cart retrieved:', emptyCart.items.length === 0 ? 'PASS' : 'FAIL');

    // Test 2: Add item to cart
    console.log('\nTest 2: Adding item to cart...');
    try {
      await cartService.addToCart(testEmail, {
        packageId: testPackageId,
        packageType: 'tour',
        selectedDate: '2025-08-15',
        selectedTime: '09:00',
        adults: 2,
        children: 1,
        pickupLocation: 'Hotel Lobby'
      });
      console.log('✅ Item added to cart: PASS');
    } catch (error: any) {
      console.log('❌ Item add failed:', error.message);
    }

    // Test 3: Get cart with items
    console.log('\nTest 3: Getting cart with items...');
    const cartWithItems = await cartService.getCart(testEmail);
    console.log('✅ Cart with items:', cartWithItems.items.length > 0 ? 'PASS' : 'FAIL');

    // Test 4: Clear cart
    console.log('\nTest 4: Clearing cart...');
    await cartService.clearCart(testEmail);
    const clearedCart = await cartService.getCart(testEmail);
    console.log('✅ Cart cleared:', clearedCart.items.length === 0 ? 'PASS' : 'FAIL');

    console.log('\n🎉 Cart functionality tests completed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error);
  }
}

export default testCartFunctionality;
