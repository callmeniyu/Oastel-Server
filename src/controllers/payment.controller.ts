// Import Stripe using require to avoid module resolution issues on some systems
const Stripe = require('stripe');
import { Request, Response } from 'express';

// Validate that Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

console.log('[STRIPE] Initializing Stripe with API key:', process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

export class PaymentController {
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

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      console.log('[PAYMENT] Creating Stripe payment intent with amount:', amountInCents, 'cents');

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingType: 'single',
          packageType: bookingData.packageType || '',
          packageId: bookingData.packageId || '',
          date: bookingData.date || '',
          time: bookingData.time || '',
          adults: bookingData.adults?.toString() || '0',
          children: bookingData.children?.toString() || '0',
          customerEmail: bookingData.contactInfo?.email || '',
          customerName: bookingData.contactInfo?.name || '',
          ...metadata
        },
        description: `Booking for ${bookingData.packageType} - ${bookingData.contactInfo?.name || 'Guest'}`,
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
          bookingType: 'cart',
          itemCount: cartData.items.length.toString(),
          customerEmail: contactInfo.email || '',
          customerName: contactInfo.name || '',
          userEmail: cartData.userEmail || '',
          ...metadata
        },
        description: `Cart booking (${cartData.items.length} items) - ${contactInfo.name || 'Guest'}`,
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

  // Confirm payment and create booking
  static async confirmPayment(req: Request, res: Response) {
    try {
      console.log('[PAYMENT] Confirming payment:', req.body);

      const { paymentIntentId, bookingData } = req.body;

      if (!paymentIntentId) {
        console.error('[PAYMENT] Missing payment intent ID');
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log('[PAYMENT] Payment intent status:', paymentIntent.status);

      if (paymentIntent.status !== 'succeeded') {
        console.error('[PAYMENT] Payment not successful:', paymentIntent.status);
        return res.status(400).json({
          success: false,
          error: 'Payment was not successful',
          paymentStatus: paymentIntent.status
        });
      }

      // Payment successful - now create the booking
      console.log('[PAYMENT] Payment successful, creating booking...');

      // Import booking models and services
      const Booking = require('../models/Booking').default;

      let bookingResult;

      if (paymentIntent.metadata.bookingType === 'cart') {
        // Handle cart booking
        const { cartBookingService } = require('../services/cartBooking.service');

        console.log('[PAYMENT] Cart booking metadata:', paymentIntent.metadata);

        const cartBookingRequest = {
          userEmail: paymentIntent.metadata.userEmail,
          contactInfo: bookingData.contactInfo,
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100, // Convert back from cents
            currency: paymentIntent.currency,
            paymentStatus: 'succeeded',
            paymentMethod: 'stripe'
          }
        };

        console.log('[PAYMENT] Cart booking request:', cartBookingRequest);

        const cartResult = await cartBookingService.bookCartItems(cartBookingRequest);

        console.log('[PAYMENT] Cart booking result:', cartResult);

        // Transform cart service result to match expected format
        bookingResult = {
          success: cartResult.success,
          bookingIds: cartResult.bookings,
          totalBookings: cartResult.bookings.length,
          error: cartResult.errors.length > 0 ? cartResult.errors.join(', ') : null,
          data: cartResult
        };

      } else {
        // Handle single booking
        const finalBookingData = {
          ...bookingData,
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100, // Convert back from cents
            currency: paymentIntent.currency,
            paymentStatus: 'succeeded',
            paymentMethod: 'stripe',
            bankCharge: Math.round((paymentIntent.amount / 100) * 0.028 * 100) / 100
          }
        };

        // Create single booking
        const booking = new Booking(finalBookingData);
        const savedBooking = await booking.save();

        bookingResult = {
          success: true,
          data: savedBooking,
          bookingIds: [savedBooking._id]
        };
      }

      if (bookingResult.success) {
        console.log('[PAYMENT] Booking created successfully:', bookingResult.bookingIds);

        res.json({
          success: true,
          message: 'Payment confirmed and booking created',
          data: {
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            bookingIds: bookingResult.bookingIds,
            totalBookings: bookingResult.totalBookings || 1
          }
        });
      } else {
        console.error('[PAYMENT] Failed to create booking after payment:', bookingResult.error);

        // Payment was successful but booking creation failed
        // This is a critical error that needs manual intervention
        res.status(500).json({
          success: false,
          error: 'Payment successful but booking creation failed',
          paymentIntentId: paymentIntent.id,
          bookingError: bookingResult.error
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
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('[WEBHOOK] Payment failed:', failedPayment.id, failedPayment.last_payment_error?.message);
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
