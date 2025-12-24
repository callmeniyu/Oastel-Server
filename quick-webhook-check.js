/**
 * Simple Webhook Test - Check Stripe Dashboard for delivery status
 */

require('dotenv').config();
const https = require('https');

console.log('=== QUICK WEBHOOK STATUS CHECK ===\n');

console.log('✅ What we know:');
console.log('   - Webhook secret is configured in .env');
console.log('   - Server code is ready to receive webhooks');
console.log('   - Webhook endpoint: /webhook/stripe\n');

console.log('❓ What we need to verify:\n');

console.log('1️⃣  Is the webhook configured in Stripe Dashboard?');
console.log('   Go to: https://dashboard.stripe.com/webhooks');
console.log('   - You should see your webhook endpoint listed');
console.log('   - Status should be "Enabled"');
console.log('   - Click on it to see delivery attempts\n');

console.log('2️⃣  Is your server publicly accessible?');
const serverUrl = process.env.SERVER_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
if (serverUrl) {
  console.log(`   Your configured URL: ${serverUrl}`);
  console.log(`   Webhook URL should be: ${serverUrl}/webhook/stripe\n`);
} else {
  console.log('   ⚠️  No SERVER_URL found in .env');
  console.log('   You need to add: SERVER_URL=https://your-production-domain.com\n');
}

console.log('3️⃣  Test the endpoint (with server running):');
console.log('   Windows PowerShell:');
console.log(`   Invoke-WebRequest -Uri "${serverUrl || 'http://localhost:3001'}/webhook/stripe" -Method POST`);
console.log('\n   Mac/Linux:');
console.log(`   curl -X POST ${serverUrl || 'http://localhost:3001'}/webhook/stripe\n`);
console.log('   Expected response: 400 or 401 error (good - endpoint exists)');
console.log('   Bad response: 404 (endpoint not found) or timeout\n');

console.log('4️⃣  EASIEST WAY TO TEST - Use Stripe CLI:\n');
console.log('   Install Stripe CLI first (one-time setup):');
console.log('   - Windows: scoop install stripe');
console.log('   - Mac: brew install stripe/stripe-cli/stripe');
console.log('   - Or download: https://github.com/stripe/stripe-cli/releases\n');

console.log('   Then test (server must be running):');
console.log('   ```');
console.log('   cd server');
console.log('   npm run dev        # Start server (in one terminal)');
console.log('   ```\n');
console.log('   In another terminal:');
console.log('   ```');
console.log('   stripe login');
console.log('   stripe listen --forward-to http://localhost:3001/webhook/stripe');
console.log('   ```\n');
console.log('   In a THIRD terminal:');
console.log('   ```');
console.log('   stripe trigger payment_intent.succeeded');
console.log('   ```\n');
console.log('   Then check: node test-webhook-status.js\n');

console.log('5️⃣  Or make a REAL test booking:');
console.log('   - Go to your website');
console.log('   - Make a booking with test card: 4242 4242 4242 4242');
console.log('   - Complete payment');
console.log('   - Check if booking status becomes "confirmed"');
console.log('   - Check if you receive confirmation email');
console.log('   - Run: node test-webhook-status.js\n');

console.log('=== WHAT TO CHECK IN STRIPE DASHBOARD ===\n');
console.log('Go to: https://dashboard.stripe.com/webhooks');
console.log('Click on your webhook endpoint\n');
console.log('Look for:');
console.log('✅ "Enabled" status');
console.log('✅ Recent events in "Events" tab');
console.log('✅ "Succeeded" delivery status\n');
console.log('If you see "Failed" deliveries:');
console.log('- Click on the failed event');
console.log('- Check "Response" tab for error details');
console.log('- Common issues: 404 (wrong URL), 401 (wrong secret), timeout (not accessible)\n');

console.log('=== NEED IMMEDIATE HELP? ===\n');
console.log('Tell me:');
console.log('1. What URL did you configure in Stripe Dashboard?');
console.log('2. Is your server running on production or local?');
console.log('3. Can you access your server URL from outside your network?');
console.log('4. What does Stripe Dashboard show for webhook delivery status?\n');
