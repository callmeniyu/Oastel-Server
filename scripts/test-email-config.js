// Test script to verify email configuration and functionality
const dotenv = require('dotenv');
const path = require('path');

// Load .env from CWD first, then server/.env as a fallback
dotenv.config();
if (!process.env.MONGO_URI) {
  const fallback = path.join(__dirname, '..', '.env');
  dotenv.config({ path: fallback });
}

async function testEmailConfiguration() {
  console.log('📧 Testing Email Configuration...\n');

  // Check environment variables
  console.log('1. Environment Variables Check:');
  console.log('   BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
  console.log('   FROM_EMAIL:', process.env.FROM_EMAIL ? '✅ Set' : '❌ Missing');
  console.log('   FROM_NAME:', process.env.FROM_NAME ? '✅ Set' : '❌ Missing');

  // Check email configuration
  let canSendEmail = false;
  let method = 'none';
  const issues = [];

  if (process.env.BREVO_API_KEY) {
    method = 'Brevo API';
    canSendEmail = true;
    console.log('\n✅ Brevo API available - primary email method');
  } else {
    issues.push('BREVO_API_KEY not set');
  }

  if (!canSendEmail) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      method = 'SMTP';
      canSendEmail = true;
      console.log('\n✅ SMTP configuration available - fallback email method');
    } else {
      if (!process.env.SMTP_USER) issues.push('SMTP_USER not set');
      if (!process.env.SMTP_PASS) issues.push('SMTP_PASS not set');
    }
  }

  console.log('\n2. Email Configuration Summary:');
  console.log('   Can Send Email:', canSendEmail ? '✅ YES' : '❌ NO');
  console.log('   Primary Method:', method);
  
  if (issues.length > 0) {
    console.log('   Issues:', issues.join(', '));
  }

  // Test email service if configuration is available
  if (canSendEmail) {
    console.log('\n3. Testing Email Service...');
    try {
      // Import email service
      const { EmailService } = require('../dist/services/email.service');
      
      // Create test booking data
      const testBookingData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com', // Change this to your email to receive test
        bookingId: 'TEST123',
        packageId: 'test-package-id',
        packageName: 'Test Package',
        packageType: 'tour',
        date: '2025-09-20',
        time: '09:00',
        adults: 2,
        children: 1,
        pickupLocation: 'Test Location',
        total: 150,
        currency: 'MYR'
      };

      console.log('   Test email data prepared');
      console.log('   Recipient:', testBookingData.customerEmail);
      console.log('   Package:', testBookingData.packageName);
      
      // Uncomment the line below to actually send a test email
      // const emailService = new EmailService();
      // const result = await emailService.sendBookingConfirmation(testBookingData);
      
      console.log('   📝 Note: Test email sending is commented out to prevent spam');
      console.log('   📝 Uncomment the lines in the script to send an actual test email');
      
    } catch (error) {
      console.error('   ❌ Error testing email service:', error.message);
    }
  }

  console.log('\n4. Recommendations:');
  if (!process.env.BREVO_API_KEY) {
    console.log('   • Set up BREVO_API_KEY for reliable email delivery');
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('   • Configure SMTP credentials as fallback');
  }
  if (canSendEmail) {
    console.log('   • Email configuration looks good! ✅');
    console.log('   • Test with a real booking to verify end-to-end flow');
  }

  console.log('\n🏁 Email configuration test completed');
}

testEmailConfiguration().catch(console.error);