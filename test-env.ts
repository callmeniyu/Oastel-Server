// Test environment variables loading
import './src/config/env';

console.log('🔍 Testing Environment Variables:\n');

console.log('Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Missing');
console.log('');

console.log('Email Configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? `Set (${process.env.SMTP_PASS.length} chars)` : 'Missing');
console.log('FROM_NAME:', process.env.FROM_NAME);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('');

// Test email config import
import { emailConfig } from './src/config/email.config';
console.log('Email Config Object:');
console.log('Host:', emailConfig.smtp.host);
console.log('Port:', emailConfig.smtp.port);
console.log('User:', emailConfig.smtp.auth.user);
console.log('Pass Length:', emailConfig.smtp.auth.pass ? emailConfig.smtp.auth.pass.length : 0);
console.log('From Email:', emailConfig.from.email);

if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
  console.log('\n❌ Email credentials are missing!');
  console.log('Make sure your .env file has SMTP_USER and SMTP_PASS set correctly.');
} else {
  console.log('\n✅ Email credentials are loaded successfully!');
}
