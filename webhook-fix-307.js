/**
 * WEBHOOK FIX - 307 Redirect Issue
 * 
 * PROBLEM: https://oastel.com/webhook/stripe redirects to https://www.oastel.com/webhook/stripe
 * SOLUTION: Use your Digital Ocean backend server URL directly
 */

console.log('=== WEBHOOK 307 REDIRECT - SOLUTION ===\n');

console.log('❌ CURRENT ISSUE:');
console.log('   Webhook URL: https://oastel.com/webhook/stripe');
console.log('   Status: 307 Redirect to https://www.oastel.com/webhook/stripe');
console.log('   Result: All webhooks failing\n');

console.log('🔍 ROOT CAUSE:');
console.log('   Your setup appears to be:');
console.log('   - Frontend: Vercel (oastel.com)');
console.log('   - Backend API: Digital Ocean server');
console.log('   - The frontend redirects webhook requests\n');

console.log('✅ SOLUTION - Use Direct Backend URL:\n');

console.log('Your backend server is likely at one of these URLs:');
console.log('1. https://api.oastel.com/webhook/stripe');
console.log('2. https://server.oastel.com/webhook/stripe'); 
console.log('3. http://YOUR-DROPLET-IP:3001/webhook/stripe');
console.log('4. https://backend.oastel.com/webhook/stripe\n');

console.log('📋 HOW TO FIND YOUR BACKEND URL:\n');

console.log('Option 1: Check your client code');
console.log('-----------------------------------');
console.log('Look in: client/.env or client/.env.production');
console.log('Find: NEXT_PUBLIC_API_URL or API_URL');
console.log('Example: NEXT_PUBLIC_API_URL=https://api.oastel.com\n');

console.log('Option 2: Check your server');
console.log('-----------------------------------');
console.log('SSH into your Digital Ocean droplet and check:');
console.log('- What domain/IP is the server listening on?');
console.log('- Check nginx config: /etc/nginx/sites-available/');
console.log('- Check if you have a subdomain for API\n');

console.log('Option 3: Check DNS records');
console.log('-----------------------------------');
console.log('Check your DNS settings for subdomains like:');
console.log('- api.oastel.com');
console.log('- server.oastel.com');
console.log('- backend.oastel.com\n');

console.log('🔧 STEP-BY-STEP FIX:\n');

console.log('1. Find your backend server URL (use options above)\n');

console.log('2. Test the backend URL works:');
console.log('   curl -X POST https://YOUR-BACKEND-URL/webhook/stripe');
console.log('   Expected: 400 or 401 error (good - endpoint exists)');
console.log('   Bad: 404 or timeout\n');

console.log('3. Update Stripe Dashboard webhook URL:');
console.log('   - Go to: https://dashboard.stripe.com/webhooks');
console.log('   - Click your webhook endpoint');
console.log('   - Click "..." → Update details');
console.log('   - Change URL to backend URL');
console.log('   - Example: https://api.oastel.com/webhook/stripe');
console.log('   - Save\n');

console.log('4. Test immediately:');
console.log('   - In Stripe Dashboard, click "Send test webhook"');
console.log('   - Select event type: payment_intent.succeeded');
console.log('   - Click Send test webhook\n');

console.log('5. Check result:');
console.log('   - Should show "Succeeded" in Stripe Dashboard');
console.log('   - Run: node test-webhook-status.js');
console.log('   - Should show 1+ webhook events\n\n');

console.log('💡 COMMON SETUPS:\n');

console.log('If using separate subdomains:');
console.log('  Frontend: https://oastel.com (Vercel)');
console.log('  Backend: https://api.oastel.com (Digital Ocean)');
console.log('  → Use: https://api.oastel.com/webhook/stripe\n');

console.log('If using proxy/rewrite:');
console.log('  Frontend: https://oastel.com');
console.log('  Backend routes: https://oastel.com/api/*');
console.log('  → Use: https://oastel.com/api/webhook/stripe\n');

console.log('If backend is private (no public domain):');
console.log('  → You need to expose backend publicly');
console.log('  → Or use a reverse proxy (nginx) to route /webhook/stripe to backend\n\n');

console.log('🎯 IMMEDIATE ACTION:\n');
console.log('Check your client/.env.production file for the backend API URL.');
console.log('That URL + /webhook/stripe is what you should use in Stripe Dashboard.\n');

console.log('Example:');
console.log('If client/.env has: NEXT_PUBLIC_API_URL=https://api.oastel.com');
console.log('Then use in Stripe: https://api.oastel.com/webhook/stripe\n');
