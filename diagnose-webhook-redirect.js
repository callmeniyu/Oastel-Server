/**
 * Diagnose Webhook URL Redirect Issue
 * 
 * This script helps identify the correct webhook URL to use
 */

const https = require('https');
const http = require('http');

console.log('=== WEBHOOK URL REDIRECT DIAGNOSIS ===\n');

console.log('❌ PROBLEM IDENTIFIED:');
console.log('   All webhooks failing with 307 error (Temporary Redirect)');
console.log('   Current URL: https://oastel.com/webhook/stripe\n');

console.log('🔍 CAUSE:');
console.log('   The URL is redirecting to another URL');
console.log('   Common redirects:');
console.log('   - https://oastel.com → https://www.oastel.com');
console.log('   - http://oastel.com → https://oastel.com');
console.log('   - One path to another\n');

console.log('✅ SOLUTION:');
console.log('   Use the FINAL URL after all redirects in Stripe Dashboard\n');

console.log('📋 HOW TO FIND THE CORRECT URL:\n');

console.log('Option 1: Test with curl (Recommended)');
console.log('-------------------------------------------\n');
console.log('Run this command on your local machine:\n');
console.log('curl -v -X POST https://oastel.com/webhook/stripe\n');
console.log('Look for:');
console.log('- "< HTTP/1.1 307" or "< HTTP/1.1 301/302" = REDIRECT FOUND');
console.log('- "< Location: https://..." = THIS IS THE CORRECT URL TO USE');
console.log('- "< HTTP/1.1 400" or "< HTTP/1.1 401" = NO REDIRECT (URL is correct)\n\n');

console.log('Option 2: Test common URL variations');
console.log('-------------------------------------------\n');
console.log('Try these URLs in your browser:\n');
console.log('1. https://oastel.com/webhook/stripe');
console.log('2. https://www.oastel.com/webhook/stripe');
console.log('3. https://api.oastel.com/webhook/stripe');
console.log('4. Check which one does NOT redirect\n\n');

console.log('Option 3: Check your server configuration');
console.log('-------------------------------------------\n');
console.log('Check your nginx/apache config for redirects:');
console.log('- Are you redirecting www to non-www (or vice versa)?');
console.log('- Are you redirecting to a different domain?');
console.log('- Check: /etc/nginx/sites-available/oastel.com\n\n');

console.log('🔧 STEP-BY-STEP FIX:\n');

console.log('1. Find the correct URL using one of the methods above\n');

console.log('2. Update Stripe Dashboard:');
console.log('   - Go to: https://dashboard.stripe.com/webhooks');
console.log('   - Click on your webhook endpoint');
console.log('   - Click "..." menu → "Update details"');
console.log('   - Change URL to the correct one (e.g., https://www.oastel.com/webhook/stripe)');
console.log('   - Save\n');

console.log('3. Wait 1-2 minutes for Stripe to update\n');

console.log('4. Test by triggering a webhook:');
console.log('   - Make a test booking with card 4242 4242 4242 4242');
console.log('   - Or in Stripe Dashboard, click "Send test webhook"\n');

console.log('5. Verify in Stripe Dashboard:');
console.log('   - Go to webhook → Events tab');
console.log('   - Latest event should show "Succeeded" instead of "Failed"\n');

console.log('6. Verify in database:');
console.log('   - Run: node test-webhook-status.js');
console.log('   - Should show webhook events received\n\n');

console.log('💡 QUICK TEST COMMANDS:\n');
console.log('Windows PowerShell:');
console.log('Invoke-WebRequest -Uri "https://oastel.com/webhook/stripe" -Method POST -MaximumRedirection 0\n');

console.log('Mac/Linux:');
console.log('curl -v -X POST https://oastel.com/webhook/stripe 2>&1 | grep -i location\n');
console.log('curl -v -X POST https://www.oastel.com/webhook/stripe 2>&1 | grep -i location\n\n');

console.log('🎯 MOST LIKELY SOLUTIONS:\n');
console.log('If https://oastel.com redirects to https://www.oastel.com:');
console.log('   → Update Stripe webhook URL to: https://www.oastel.com/webhook/stripe\n');

console.log('If you have a separate API subdomain:');
console.log('   → Update Stripe webhook URL to: https://api.oastel.com/webhook/stripe\n');

console.log('If server is behind a proxy/load balancer:');
console.log('   → Use the direct backend URL (not the frontend URL)\n\n');

console.log('📞 NEED HELP?\n');
console.log('Run these commands and share the output:\n');
console.log('curl -I -X POST https://oastel.com/webhook/stripe');
console.log('curl -I -X POST https://www.oastel.com/webhook/stripe\n');
