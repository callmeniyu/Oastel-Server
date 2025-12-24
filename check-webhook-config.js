/**
 * Stripe Webhook Configuration Checker
 * 
 * This script helps diagnose webhook configuration issues
 */

require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');

async function checkWebhookConfiguration() {
  console.log('=== STRIPE WEBHOOK CONFIGURATION CHECKER ===\n');

  // Check environment variables
  console.log('1️⃣  Checking Environment Variables...\n');
  
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  const serverUrl = process.env.SERVER_URL || process.env.API_URL || 'NOT SET';

  console.log(`Stripe Secret Key: ${hasStripeKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`Webhook Secret: ${hasWebhookSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`Server URL: ${serverUrl}\n`);

  if (hasWebhookSecret) {
    console.log(`Webhook Secret (first 12 chars): ${process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 12)}...\n`);
  }

  // Check database for webhook events
  console.log('2️⃣  Checking Database for Webhook Events...\n');
  
  let totalEvents = 0;
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGO_URI);
    
    const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({}, { strict: false }));
    
    totalEvents = await WebhookEvent.countDocuments();
    const recentEvents = await WebhookEvent.find().sort({ createdAt: -1 }).limit(5);
    
    console.log(`Total webhook events in DB: ${totalEvents}`);
    
    if (totalEvents > 0) {
      console.log('✅ Webhooks have been received before');
      console.log('\nRecent webhook events:');
      recentEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.eventId} (${event.source}) - ${event.createdAt}`);
      });
    } else {
      console.log('❌ NO webhook events found in database');
      console.log('   This means webhooks are NOT configured or NOT working');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  }

  // Check if webhook endpoint is accessible
  console.log('\n3️⃣  Testing Webhook Endpoint Accessibility...\n');
  console.log('⚠️  Note: This test requires the server to be running\n');

  // Instructions for manual testing
  console.log('4️⃣  Manual Testing Steps:\n');
  console.log('To test if your webhook endpoint is accessible:');
  console.log('\n1. Make sure your server is running');
  console.log('   cd server && npm run dev');
  console.log('\n2. Test locally:');
  console.log('   curl -X POST http://localhost:3001/webhook/stripe');
  console.log('   Expected: 400 error (missing signature) - this is GOOD!');
  console.log('   Bad: 404 error or connection refused');
  console.log('\n3. Test production:');
  console.log('   curl -X POST https://your-domain.com/webhook/stripe');
  console.log('   Expected: 400 error (missing signature)');
  console.log('   Bad: 404 error or timeout\n');

  // Stripe Dashboard configuration
  console.log('5️⃣  Stripe Dashboard Configuration:\n');
  console.log('CRITICAL: You MUST configure webhooks in Stripe Dashboard');
  console.log('\nSteps to configure:');
  console.log('1. Go to: https://dashboard.stripe.com/webhooks');
  console.log('2. Click "Add endpoint"');
  console.log('3. Enter endpoint URL:');
  console.log(`   ${serverUrl !== 'NOT SET' ? serverUrl + '/webhook/stripe' : 'https://your-domain.com/webhook/stripe'}`);
  console.log('4. Select events to listen for:');
  console.log('   - payment_intent.succeeded');
  console.log('   - payment_intent.payment_failed');
  console.log('   - checkout.session.completed');
  console.log('5. Click "Add endpoint"');
  console.log('6. Click "Reveal" on signing secret and copy it');
  console.log('7. Update .env file:');
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
  console.log('8. Restart your server\n');

  // Test with Stripe CLI
  console.log('6️⃣  Testing with Stripe CLI (Recommended):\n');
  console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Login: stripe login');
  console.log('3. Forward webhooks to local server:');
  console.log('   stripe listen --forward-to localhost:3001/webhook/stripe');
  console.log('4. In another terminal, trigger a test event:');
  console.log('   stripe trigger payment_intent.succeeded');
  console.log('5. Check your server logs for webhook processing');
  console.log('6. Check database for new webhook event\n');

  // Diagnosis
  console.log('=== DIAGNOSIS ===\n');
  
  if (!hasWebhookSecret) {
    console.log('❌ CRITICAL: No webhook secret configured');
    console.log('   Action: Follow steps above to configure webhooks in Stripe Dashboard\n');
  } else if (totalEvents === 0) {
    console.log('⚠️  WARNING: Webhook secret is set but no events received');
    console.log('   Possible causes:');
    console.log('   - Webhook not configured in Stripe Dashboard');
    console.log('   - Endpoint URL is incorrect');
    console.log('   - Server is not publicly accessible');
    console.log('   - Firewall blocking Stripe IPs\n');
    console.log('   Action: Test with Stripe CLI (see section 6 above)\n');
  } else {
    console.log('✅ Webhooks appear to be configured correctly');
    console.log('   Events are being received and processed\n');
  }

  console.log('=== RECOMMENDATIONS ===\n');
  console.log('1. Configure webhooks in Stripe Dashboard (if not done)');
  console.log('2. Test with Stripe CLI to verify webhook processing');
  console.log('3. Monitor webhook events in database after configuration');
  console.log('4. Set up daily payment reconciliation script');
  console.log('5. Add monitoring/alerting for failed webhooks\n');

  console.log('=== NEXT STEPS ===\n');
  console.log('After configuring webhooks, create a test booking and verify:');
  console.log('1. Payment succeeds in Stripe');
  console.log('2. Booking status changes from "pending" to "confirmed"');
  console.log('3. Confirmation email is sent');
  console.log('4. Webhook event appears in database');
  console.log('5. Booking shows in admin panel\n');
}

checkWebhookConfiguration();
