/**
 * Trigger Test Webhook Event
 * 
 * This script helps you test the webhook by providing instructions
 * and checking if test events are received
 */

console.log('=== WEBHOOK TESTING GUIDE ===\n');

console.log('📋 STEP-BY-STEP TEST PROCEDURE:\n');

console.log('Option 1: Test with Stripe CLI (RECOMMENDED for immediate testing)');
console.log('-------------------------------------------------------------------\n');

console.log('1. Install Stripe CLI if not installed:');
console.log('   Windows: scoop install stripe');
console.log('   Mac: brew install stripe/stripe-cli/stripe');
console.log('   Linux: See https://stripe.com/docs/stripe-cli\n');

console.log('2. Login to Stripe:');
console.log('   stripe login\n');

console.log('3. Make sure your server is running:');
console.log('   cd server');
console.log('   npm run dev\n');

console.log('4. In a NEW terminal, forward webhooks to local server:');
console.log('   stripe listen --forward-to http://localhost:3001/webhook/stripe\n');
console.log('   You should see: "Ready! Your webhook signing secret is whsec_..."');
console.log('   Keep this terminal open!\n');

console.log('5. In ANOTHER terminal, trigger a test payment:');
console.log('   stripe trigger payment_intent.succeeded\n');

console.log('6. Check the output:');
console.log('   - In the "stripe listen" terminal, you should see the webhook event');
console.log('   - In your server logs, you should see webhook processing');
console.log('   - Run: node test-webhook-status.js (should show 1+ events)\n\n');

console.log('Option 2: Test with Real Booking (Tests end-to-end flow)');
console.log('-----------------------------------------------------------\n');

console.log('1. Make sure your server is running and webhook is configured in Stripe Dashboard\n');

console.log('2. Go to your website and make a test booking:');
console.log('   - Use Stripe test card: 4242 4242 4242 4242');
console.log('   - Any future expiry date');
console.log('   - Any CVC\n');

console.log('3. Complete the payment\n');

console.log('4. Check results:');
console.log('   - Run: node test-webhook-status.js');
console.log('   - Check admin panel - booking should show as "confirmed"');
console.log('   - Check email - confirmation should be sent\n\n');

console.log('Option 3: Check Stripe Dashboard');
console.log('-----------------------------------\n');

console.log('1. Go to: https://dashboard.stripe.com/webhooks\n');

console.log('2. Click on your webhook endpoint\n');

console.log('3. Check "Events" tab:');
console.log('   - Should show recent events if any payments occurred');
console.log('   - Click on an event to see delivery status');
console.log('   - If delivery failed, check the error message\n\n');

console.log('Common Issues:');
console.log('---------------\n');

console.log('❌ 404 Error:');
console.log('   - Endpoint URL is wrong in Stripe Dashboard');
console.log('   - Should be: https://your-domain.com/webhook/stripe\n');

console.log('❌ 401/403 Error:');
console.log('   - Webhook secret is wrong');
console.log('   - Get correct secret from Stripe Dashboard');
console.log('   - Update .env: STRIPE_WEBHOOK_SECRET=whsec_...');
console.log('   - Restart server\n');

console.log('❌ Timeout:');
console.log('   - Server is not publicly accessible');
console.log('   - Check firewall settings');
console.log('   - For local testing, use ngrok or Stripe CLI\n');

console.log('❌ 500 Error:');
console.log('   - Server error processing webhook');
console.log('   - Check server logs for details');
console.log('   - Verify database connection\n\n');

console.log('=== QUICK TEST COMMAND ===\n');
console.log('After making a test payment or triggering a webhook, run:\n');
console.log('   node test-webhook-status.js\n');
console.log('This will show if webhook events are being received and processed.\n');
