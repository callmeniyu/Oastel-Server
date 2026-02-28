// Import Stripe using require to avoid module resolution issues on some systems
const Stripe = require('stripe');
import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { parseDateAsMalaysiaTimezone } from '../utils/dateUtils';
// TimeSlotService used to update timeslot bookedCount; import once to avoid redeclaration
const { TimeSlotService } = require('../services/timeSlot.service');

// Validate that Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

console.log('[STRIPE] Initializing Stripe with API key:', process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

export class PaymentController {
  // Helper method to check email configuration
  private static checkEmailConfiguration(): { canSendEmail: boolean; method: string; issues: string[] } {
    const issues: string[] = [];
    let method = 'none';
    let canSendEmail = false;

    // Check Brevo configuration
    if (process.env.BREVO_API_KEY) {
      method = 'brevo';
      canSendEmail = true;
    } else {
      issues.push('BREVO_API_KEY not set');
    }

    // Check SMTP configuration if Brevo is not available
    if (!canSendEmail) {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        method = 'smtp';
        canSendEmail = true;
      } else {
        if (!process.env.SMTP_USER) issues.push('SMTP_USER not set');
        if (!process.env.SMTP_PASS) issues.push('SMTP_PASS not set');
      }
    }

    return { canSendEmail, method, issues };
  }
  // Create payment intent for single booking
  static async createPaymentIntent(req: Request, res: Response) {
    try {
      console.log('[PAYMENT] Creating payment intent for single booking:', req.body);

      const {
        amount,
        currency = 'myr',
        bookingData,
        metadata = {}
      } = req.body;

      // Validate required fields
      if (!amount || amount <= 0) {
        console.error('[PAYMENT] Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          error: 'Invalid amount provided'
        });
      }

      if (!bookingData) {
        console.error('[PAYMENT] Missing booking data');
        return res.status(400).json({
          success: false,
          error: 'Booking data is required'
        });
      }

      // Generate idempotency key based on booking details to prevent duplicate payment intents
      const idempotencyKey = `booking_${bookingData.packageId}_${bookingData.date}_${bookingData.time}_${bookingData.contactInfo?.email}_${amount}`;
      console.log('[PAYMENT] Using idempotency key:', idempotencyKey);

      // Check if a payment intent already exists for this booking within the last 5 minutes
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      const existingIntents = await stripe.paymentIntents.list({
        limit: 10,
        created: { gte: fiveMinutesAgo },
      });

      const duplicateIntent = existingIntents.data.find((intent: any) =>
        intent.metadata.packageId === bookingData.packageId &&
        intent.metadata.date === bookingData.date &&
        intent.metadata.time === bookingData.time &&
        intent.metadata.customerEmail === bookingData.contactInfo?.email &&
        intent.amount === Math.round(amount * 100) &&
        (intent.status === 'requires_payment_method' ||
          intent.status === 'requires_confirmation' ||
          intent.status === 'requires_action' ||
          intent.status === 'processing' ||
          intent.status === 'succeeded')
      );

      if (duplicateIntent) {
        console.log('[PAYMENT] Found existing payment intent:', duplicateIntent.id, 'with status:', duplicateIntent.status);

        // Return existing payment intent instead of creating a duplicate
        return res.json({
          success: true,
          data: {
            clientSecret: duplicateIntent.client_secret,
            paymentIntentId: duplicateIntent.id,
            amount: duplicateIntent.amount,
            currency: duplicateIntent.currency
          },
          message: 'Returning existing payment intent to prevent duplicate charge'
        });
      }

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      console.log('[PAYMENT] Creating Stripe payment intent with amount:', amountInCents, 'cents');

      // Fetch package details to get package name for metadata
      let packageName = bookingData.packageName || bookingData.title || '';
      if (!packageName && bookingData.packageId && bookingData.packageType) {
        try {
          const mongoose = require('mongoose');
          const PackageModel = bookingData.packageType === 'tour'
            ? mongoose.model('Tour')
            : mongoose.model('Transfer');
          const packageDetails = await PackageModel.findById(bookingData.packageId).select('title name');
          if (packageDetails) {
            packageName = packageDetails.title || packageDetails.name || '';
          }
        } catch (fetchError) {
          console.warn('[PAYMENT] Failed to fetch package name:', fetchError);
        }
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          platform: 'oastel', // Platform identifier to distinguish from mossyforestours
          bookingType: 'single',
          packageType: bookingData.packageType || '',
          packageId: bookingData.packageId || '',
          packageName: packageName,
          // Include bookingId in metadata if provided so webhooks can map back
          bookingId: bookingData._id || bookingData.bookingId || '',
          date: bookingData.date || '',
          time: bookingData.time || '',
          adults: bookingData.adults?.toString() || '0',
          children: bookingData.children?.toString() || '0',
          totalGuests: ((bookingData.adults || 0) + (bookingData.children || 0)).toString(),
          customerEmail: bookingData.contactInfo?.email || '',
          customerName: bookingData.contactInfo?.name || '',
          customerPhone: bookingData.contactInfo?.phone || '',
          pickupLocation: bookingData.pickupLocation || '',
          idempotencyKey, // Add idempotency key to metadata for tracking
          ...metadata
        },
        description: `Oastel ${bookingData.packageType} - ${bookingData.contactInfo?.name || 'Guest'}`,
      },
        {
          idempotencyKey, // Stripe's built-in idempotency protection
        });

      console.log('[PAYMENT] Payment intent created successfully:', paymentIntent.id);

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      });

    } catch (error: any) {
      console.error('[PAYMENT] Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create payment intent'
      });
    }
  }

  // Create payment intent for cart booking
  static async createCartPaymentIntent(req: Request, res: Response) {
    try {
      console.log('[PAYMENT] Creating payment intent for cart booking:', req.body);

      const {
        amount,
        currency = 'myr',
        cartData,
        contactInfo,
        metadata = {}
      } = req.body;

      // Validate required fields
      if (!amount || amount <= 0) {
        console.error('[PAYMENT] Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          error: 'Invalid amount provided'
        });
      }

      if (!cartData || !cartData.items || cartData.items.length === 0) {
        console.error('[PAYMENT] Invalid cart data');
        return res.status(400).json({
          success: false,
          error: 'Cart data is required'
        });
      }

      if (!contactInfo) {
        console.error('[PAYMENT] Missing contact info');
        return res.status(400).json({
          success: false,
          error: 'Contact information is required'
        });
      }

      // Generate idempotency key for cart bookings
      const cartItemsHash = cartData.items
        .map((item: any) => `${item.packageId}_${item.date}_${item.time}`)
        .sort()
        .join('|');
      const idempotencyKey = `cart_${contactInfo.email}_${cartItemsHash}_${amount}`;
      console.log('[PAYMENT] Using cart idempotency key:', idempotencyKey.substring(0, 50) + '...');

      // Check for recent duplicate cart payment intents
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      const existingIntents = await stripe.paymentIntents.list({
        limit: 10,
        created: { gte: fiveMinutesAgo },
      });

      const duplicateIntent = existingIntents.data.find((intent: any) =>
        intent.metadata.bookingType === 'cart' &&
        intent.metadata.customerEmail === contactInfo.email &&
        intent.amount === Math.round(amount * 100) &&
        (intent.status === 'requires_payment_method' ||
          intent.status === 'requires_confirmation' ||
          intent.status === 'requires_action' ||
          intent.status === 'processing' ||
          intent.status === 'succeeded')
      );

      if (duplicateIntent) {
        console.log('[PAYMENT] Found existing cart payment intent:', duplicateIntent.id, 'with status:', duplicateIntent.status);

        return res.json({
          success: true,
          data: {
            clientSecret: duplicateIntent.client_secret,
            paymentIntentId: duplicateIntent.id,
            amount: duplicateIntent.amount,
            currency: duplicateIntent.currency
          },
          message: 'Returning existing cart payment intent to prevent duplicate charge'
        });
      }

      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);

      console.log('[PAYMENT] Creating Stripe payment intent for cart with amount:', amountInCents, 'cents');

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          platform: 'oastel', // Platform identifier to distinguish from mossyforestours
          bookingType: 'cart',
          itemCount: cartData.items.length.toString(),
          customerEmail: contactInfo.email || '',
          customerName: contactInfo.name || '',
          userEmail: cartData.userEmail || '',
          idempotencyKey, // Add to metadata for tracking
          ...metadata
        },
        description: `Cart booking (${cartData.items.length} items) - ${contactInfo.name || 'Guest'}`,
      },
        {
          idempotencyKey, // Stripe's built-in idempotency protection
        });

      console.log('[PAYMENT] Cart payment intent created successfully:', paymentIntent.id);

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      });

    } catch (error: any) {
      console.error('[PAYMENT] Error creating cart payment intent:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create payment intent'
      });
    }
  }

  // Confirm payment - WEBHOOK-ONLY APPROACH (Stripe Best Practice)
  // This endpoint ONLY verifies payment and waits for webhook to create booking
  // Bookings are CREATED ONLY by webhook handler for maximum reliability
  static async confirmPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.body;

      console.log('[PAYMENT] ===== WEBHOOK-ONLY MODE =====');
      console.log('[PAYMENT] Verifying payment:', paymentIntentId);

      if (!paymentIntentId) {
        console.error('[PAYMENT] Missing payment intent ID');
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      // Step 1: Verify payment succeeded in Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log('[PAYMENT] Payment status from Stripe:', paymentIntent.status);

      if (paymentIntent.status !== 'succeeded') {
        console.error('[PAYMENT] Payment not successful:', paymentIntent.status);
        return res.status(400).json({
          success: false,
          error: 'Payment was not successful',
          paymentStatus: paymentIntent.status
        });
      }

      // Step 2: Wait for webhook to create booking (with polling)
      console.log('[PAYMENT] ✅ Payment verified. Waiting for webhook to create booking...');

      const Booking = require('../models/Booking').default;
      const MAX_POLL_ATTEMPTS = 30; // 30 seconds max wait
      const POLL_INTERVAL = 1000; // Poll every 1 second

      let booking = null;
      let attempts = 0;

      while (attempts < MAX_POLL_ATTEMPTS && !booking) {
        // Check if webhook has created the booking
        booking = await Booking.findOne({
          $or: [
            { 'paymentInfo.stripePaymentIntentId': paymentIntentId },
            { 'paymentInfo.paymentIntentId': paymentIntentId }
          ]
        });

        if (booking) {
          console.log(`[PAYMENT] ✅ Webhook created booking ${booking._id} (found after ${attempts}s)`);
          break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        attempts++;

        if (attempts % 5 === 0) {
          console.log(`[PAYMENT] Still waiting for webhook... (${attempts}s elapsed)`);
        }
      }

      // Step 3: Return result
      if (booking) {
        const bookingIds = paymentIntent.metadata.bookingType === 'cart'
          ? await Booking.find({
            'paymentInfo.stripePaymentIntentId': paymentIntentId
          }).distinct('_id')
          : [booking._id];

        res.json({
          success: true,
          message: 'Payment confirmed and booking created by webhook',
          data: {
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            bookingIds,
            totalBookings: bookingIds.length,
            createdBy: 'webhook'
          }
        });
      } else {
        // Webhook hasn't processed yet - this is OK, will be processed eventually
        console.warn(`[PAYMENT] ⚠️ Webhook hasn't created booking yet after ${attempts}s`);
        console.warn(`[PAYMENT] Booking will be created by webhook shortly`);

        res.json({
          success: true,
          message: 'Payment successful. Booking is being processed by webhook.',
          data: {
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            processing: true,
            note: 'Webhook will create booking shortly. Check your email for confirmation.'
          }
        });
      }

    } catch (error: any) {
      console.error('[PAYMENT] Error confirming payment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to confirm payment'
      });
    }
  }

  // Cancel payment intent to avoid incomplete status in Stripe
  static async cancelPaymentIntent(req: Request, res: Response) {
    try {
      console.log('[PAYMENT] Canceling payment intent:', req.body);

      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        console.error('[PAYMENT] Missing payment intent ID');
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      // Retrieve payment intent to check its current status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log('[PAYMENT] Current payment intent status:', paymentIntent.status);

      // Only cancel if the payment intent is in a cancelable state
      if (paymentIntent.status === 'requires_payment_method' ||
        paymentIntent.status === 'requires_confirmation' ||
        paymentIntent.status === 'requires_action') {

        const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

        console.log('[PAYMENT] Payment intent canceled successfully:', canceledPaymentIntent.id);

        res.json({
          success: true,
          data: {
            paymentIntentId: canceledPaymentIntent.id,
            status: canceledPaymentIntent.status
          }
        });
      } else {
        console.log('[PAYMENT] Payment intent cannot be canceled, current status:', paymentIntent.status);

        res.json({
          success: true,
          message: `Payment intent is in ${paymentIntent.status} status and cannot be canceled`,
          data: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      }

    } catch (error: any) {
      console.error('[PAYMENT] Error canceling payment intent:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel payment intent'
      });
    }
  }

  // Handle webhook events from Stripe
  static async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: any;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      console.log('[WEBHOOK] Received event:', event.type, event.id);
    } catch (err: any) {
      console.error('[WEBHOOK] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as any;
        console.log('[WEBHOOK] Payment succeeded:', paymentIntent.id);
        // Additional logic can be added here
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as any;
        console.log('[WEBHOOK] Payment failed:', failedPayment?.id, failedPayment?.last_payment_error?.message);
        break;
      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    res.json({ received: true });
  }

  // Get payment status
  static async getPaymentStatus(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log('[PAYMENT] Payment status check:', paymentIntentId, paymentIntent.status);

      res.json({
        success: true,
        data: {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        }
      });

    } catch (error: any) {
      console.error('[PAYMENT] Error checking payment status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check payment status'
      });
    }
  }
}
