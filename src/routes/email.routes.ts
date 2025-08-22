import { Router } from 'express';
import { BrevoEmailService } from '../services/brevo.service';
import { EmailService } from '../services/email.service';

const router = Router();

/**
 * Test endpoint to verify Brevo email configuration
 * POST /api/email/test
 * Body: { "email": "test@example.com" }
 */
router.post('/test', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    // Check if Brevo is configured
    if (!process.env.BREVO_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'BREVO_API_KEY is not configured in environment variables',
        instructions: 'Please set BREVO_API_KEY in your .env file',
      });
    }

    console.log(`📧 Testing email delivery to: ${email}`);
    
    const success = await BrevoEmailService.sendTestEmail(email);

    if (success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        provider: 'Brevo API',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        provider: 'Brevo API',
      });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test endpoint to send a sample booking confirmation email
 * POST /api/email/test-booking
 * Body: { "email": "test@example.com" }
 */
router.post('/test-booking', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    console.log(`📧 Testing booking confirmation email to: ${email}`);

    // Create sample booking data
    const sampleBooking = {
      customerName: 'John Doe',
      customerEmail: email,
      bookingId: 'TEST-' + Date.now(),
      packageId: 'sample-tour-123',
      packageName: 'Langkawi Island Hopping Tour',
      packageType: 'tour' as const,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      time: '09:00',
      adults: 2,
      children: 1,
      pickupLocation: 'Hotel Lobby',
      total: 150.00,
      currency: 'MYR',
    };

    const emailService = new EmailService();
    const success = await emailService.sendBookingConfirmation(sampleBooking);

    if (success) {
      res.json({
        success: true,
        message: `Booking confirmation test email sent successfully to ${email}`,
        bookingId: sampleBooking.bookingId,
        provider: process.env.BREVO_API_KEY ? 'Brevo API' : 'SMTP',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send booking confirmation test email',
        provider: process.env.BREVO_API_KEY ? 'Brevo API' : 'SMTP',
      });
    }
  } catch (error) {
    console.error('Error in test booking email endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test endpoint to send a sample cart booking confirmation email
 * POST /api/email/test-cart
 * Body: { "email": "test@example.com" }
 */
router.post('/test-cart', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    console.log(`📧 Testing cart booking confirmation email to: ${email}`);

    // Create sample cart booking data
    const sampleCartData = {
      customerName: 'Jane Smith',
      customerEmail: email,
      bookings: [
        {
          bookingId: 'TEST-CART-1-' + Date.now(),
          packageId: 'langkawi-tour-1',
          packageName: 'Langkawi Mangrove Tour',
          packageType: 'tour' as const,
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          time: '09:00',
          adults: 2,
          children: 0,
          pickupLocation: 'Kuah Jetty',
          total: 120.00,
        },
        {
          bookingId: 'TEST-CART-2-' + Date.now(),
          packageId: 'transfer-1',
          packageName: 'Airport Transfer Service',
          packageType: 'transfer' as const,
          from: 'Langkawi Airport',
          to: 'Pantai Cenang',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          time: '14:30',
          adults: 2,
          children: 0,
          pickupLocation: 'Arrival Hall',
          total: 35.00,
        },
      ],
      totalAmount: 155.00,
      currency: 'MYR',
    };

    const emailService = new EmailService();
    const success = await emailService.sendCartBookingConfirmation(sampleCartData);

    if (success) {
      res.json({
        success: true,
        message: `Cart booking confirmation test email sent successfully to ${email}`,
        bookingsCount: sampleCartData.bookings.length,
        totalAmount: sampleCartData.totalAmount,
        provider: process.env.BREVO_API_KEY ? 'Brevo API' : 'SMTP',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send cart booking confirmation test email',
        provider: process.env.BREVO_API_KEY ? 'Brevo API' : 'SMTP',
      });
    }
  } catch (error) {
    console.error('Error in test cart email endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get email configuration status
 * GET /api/email/status
 */
router.get('/status', (req, res) => {
  try {
    const status = {
      brevo: {
        configured: !!process.env.BREVO_API_KEY,
        provider: 'Brevo API (Recommended)',
        ports: 'Uses HTTPS (443) - No port blocking issues',
      },
      smtp: {
        configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        provider: 'SMTP (Fallback)',
        note: 'May be blocked on DigitalOcean droplets',
      },
      activeProvider: process.env.BREVO_API_KEY ? 'Brevo API' : 'SMTP',
      recommendation: process.env.BREVO_API_KEY 
        ? 'Brevo API is configured and will be used for email delivery'
        : 'Configure BREVO_API_KEY to bypass SMTP port blocking issues',
    };

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in email status endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
