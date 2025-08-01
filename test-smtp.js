// Test SMTP Connection
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPConnection() {
  console.log('🔍 Testing SMTP Connection...\n');
  
  // Log configuration (without password)
  console.log('Configuration:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
  console.log('SMTP_PASS (first 4 chars):', process.env.SMTP_PASS ? process.env.SMTP_PASS.substring(0, 4) + '...' : 'Not set');
  console.log('');

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    // Test sending email
    console.log('\n🔄 Sending test email...');
    const info = await transporter.sendMail({
      from: `"Oastel Travel" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'Test Email - SMTP Working',
      text: 'This is a test email to verify SMTP configuration is working correctly.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP configuration is working correctly.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication Error - Possible solutions:');
      console.log('1. Ensure 2-factor authentication is enabled on Gmail');
      console.log('2. Generate a new App Password from Google Account settings');
      console.log('3. Use the App Password (16 characters, no spaces) in SMTP_PASS');
      console.log('4. Make sure Less Secure Apps is NOT enabled (use App Password instead)');
    }
    
    if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection Error - Possible solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify SMTP host and port settings');
      console.log('3. Check firewall settings');
    }
  }
}

testSMTPConnection();
