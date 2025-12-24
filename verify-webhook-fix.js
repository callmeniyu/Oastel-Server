/**
 * Quick verification after webhook secret update
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function verifyWebhookAfterUpdate() {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGO_URI);
    
    const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'webhookevents' }));
    
    const totalEvents = await WebhookEvent.countDocuments();
    
    console.log('\n🔍 Webhook Status Check:\n');
    console.log(`Total webhook events in database: ${totalEvents}\n`);
    
    if (totalEvents > 0) {
      console.log('✅ SUCCESS! Webhooks are now working!\n');
      
      const recentEvents = await WebhookEvent.find().sort({ createdAt: -1 }).limit(5);
      console.log('Recent webhook events:');
      recentEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.eventId}`);
        console.log(`     Created: ${event.createdAt}\n`);
      });
    } else {
      console.log('❌ No webhook events yet\n');
      console.log('Troubleshooting checklist:');
      console.log('  [ ] Updated webhook URL in Stripe to: https://api.oastel.my/webhook/stripe');
      console.log('  [ ] Copied NEW signing secret from Stripe Dashboard');
      console.log('  [ ] Updated .env file with new STRIPE_WEBHOOK_SECRET');
      console.log('  [ ] Restarted the server');
      console.log('  [ ] Sent test webhook from Stripe Dashboard');
      console.log('\nIf all checked, wait 1-2 minutes and run this script again.\n');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyWebhookAfterUpdate();
