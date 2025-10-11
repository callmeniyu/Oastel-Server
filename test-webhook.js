#!/usr/bin/env node
/**
 * Test script to verify Stripe webhook functionality
 * This script simulates webhook events to test the payment flow
 */

const crypto = require('crypto');
const axios = require('axios');

// Test configuration
const WEBHOOK_URL = 'http://localhost:3001/webhook/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

function createWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhookEvent(eventData) {
  try {
    const payload = JSON.stringify(eventData);
    const signature = createWebhookSignature(payload, WEBHOOK_SECRET);
    
    console.log(`🧪 Testing webhook event: ${eventData.type}`);
    console.log(`📦 Payload: ${payload.substring(0, 100)}...`);
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature,
      },
    });
    
    console.log(`✅ Webhook test successful: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.error(`❌ Webhook test failed:`, error.response ? error.response.data : error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Stripe webhook tests...\n');
  
  // Test 1: Successful payment intent
  const successfulPaymentEvent = {
    id: 'evt_test_webhook_success',
    object: 'event',
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_successful_payment',
        amount: 10000, // $100.00
        currency: 'myr',
        status: 'succeeded',
        metadata: {
          bookingId: '60f1234567890abcdef12345',
        },
      },
    },
  };
  
  // Test 2: Failed payment intent
  const failedPaymentEvent = {
    id: 'evt_test_webhook_failure',
    object: 'event', 
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_failed_payment',
        amount: 5000, // $50.00
        currency: 'myr',
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
        },
        metadata: {
          bookingId: '60f1234567890abcdef12346',
        },
      },
    },
  };
  
  // Test 3: Successful checkout session
  const checkoutSessionEvent = {
    id: 'evt_test_checkout_success',
    object: 'event',
    api_version: '2020-08-27', 
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_successful_checkout',
        amount_total: 15000, // $150.00
        currency: 'myr',
        payment_status: 'paid',
        metadata: {
          bookingId: '60f1234567890abcdef12347',
        },
      },
    },
  };
  
  // Run tests
  const results = [];
  results.push(await testWebhookEvent(successfulPaymentEvent));
  results.push(await testWebhookEvent(failedPaymentEvent));
  results.push(await testWebhookEvent(checkoutSessionEvent));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All webhook tests passed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Some webhook tests failed. Check the server logs.');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  console.log('📋 Stripe Webhook Test Suite');
  console.log('===========================\n');
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set, using test secret');
  }
  
  runTests().catch((error) => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { testWebhookEvent, createWebhookSignature };