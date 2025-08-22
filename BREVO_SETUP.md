# Brevo Email Integration Setup Guide

## Overview

This guide helps you fix the blocked SMTP port issue on DigitalOcean by integrating Brevo's HTTP API for email delivery.

## What was implemented:

1. ✅ Created `BrevoEmailService` class that uses Brevo's HTTP API (bypasses SMTP port blocking)
2. ✅ Updated existing `EmailService` to try Brevo first, fallback to SMTP if needed
3. ✅ Added test endpoints to verify email delivery works
4. ✅ All existing email templates are preserved (booking confirmations, cart bookings, review requests)

## Steps to complete the setup:

### 1. Sign up for Brevo (Free tier available)

- Go to https://brevo.com
- Create a free account
- Verify your email address

### 2. Get your Brevo API key

- Login to Brevo dashboard
- Go to "Settings" → "API Keys"
- Create a new API key
- Copy the API key (starts with `xkeysib-...`)

### 3. Verify your sender email

- In Brevo dashboard, go to "Senders & IP" → "Senders"
- Add your sender email: ``
- Verify the email by clicking the link they send

### 4. Update your server .env file

Replace this line in `/server/.env`:

```
BREVO_API_KEY=your_brevo_api_key_here_replace_this
```

With your actual API key:

```
BREVO_API_KEY=xkeysib-abc123def456...your_actual_key
```

### 5. Restart your server

```bash
# On your DigitalOcean droplet:
cd /path/to/your/server
pm2 restart server
# OR if using different process manager:
sudo systemctl restart your-server-service
```

### 6. Test email delivery

#### Test basic email sending:

```bash
curl -X POST http://your-droplet-ip:3002/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

#### Test booking confirmation email:

```bash
curl -X POST http://your-droplet-ip:3002/api/email/test-booking \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

#### Check email configuration status:

```bash
curl http://your-droplet-ip:3002/api/email/status
```

### 7. Verify in production

1. Make a real booking on your website
2. Check server logs for: `✅ Booking confirmation email sent successfully via Brevo`
3. Check customer email for confirmation

## What happens now:

- ✅ **Booking confirmations** automatically use Brevo API (no SMTP ports needed)
- ✅ **Cart booking confirmations** automatically use Brevo API
- ✅ **Review request emails** automatically use Brevo API
- ✅ All emails use your existing beautiful HTML templates
- ✅ If Brevo fails, system falls back to SMTP (for redundancy)

## Troubleshooting:

### If test emails fail:

1. Check server logs for error messages
2. Verify `BREVO_API_KEY` is set correctly in .env
3. Ensure sender email is verified in Brevo dashboard
4. Check Brevo dashboard for bounce/error reports

### If booking confirmations still don't work:

1. Check server logs when making a booking
2. Look for these log messages:
   - `📧 Using Brevo API for email delivery...`
   - `✅ Booking confirmation email sent successfully via Brevo`

### Getting support:

- Brevo support: https://help.brevo.com
- Server logs location: usually `/var/log/` or check with `pm2 logs`

## Free tier limits:

- Brevo free tier: 300 emails/day
- Should be sufficient for most booking confirmation needs
- Upgrade plans available if you need more volume

## Success indicators:

✅ Test emails are delivered successfully  
✅ Booking confirmations reach customers  
✅ No more "SMTP port blocked" errors in logs  
✅ Email delivery uses HTTPS (port 443) instead of SMTP ports

The SMTP port blocking issue should be completely resolved once Brevo API key is configured!
