import { Request, Response } from 'express';
import BookingModel from '../models/Booking';
import BookingService from './booking.service';

// Import Stripe using require to avoid module resolution issues
const Stripe = require('stripe');

// Validate that Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

/**
 * Payment Recovery Service
 * Handles recovery of successful payments that failed to create bookings
 */
export class PaymentRecoveryService {
  /**
   * Scan for orphaned payments (successful in Stripe but no booking in DB)
   * Useful for detecting payment-booking mismatches
   */
  static async scanOrphanedPayments(req: Request, res: Response) {
    try {
      console.log('[RECOVERY] 🔍 Scanning for orphaned payments...');

      const hoursAgo = parseInt(req.query.hours as string) || 24;
      const limit = parseInt(req.query.limit as string) || 50;

      // Get successful payment intents from last N hours
      const startTime = Math.floor(Date.now() / 1000) - (hoursAgo * 3600);
      
      const paymentIntents = await stripe.paymentIntents.list({
        limit,
        created: { gte: startTime },
      });

      console.log(`[RECOVERY] Found ${paymentIntents.data.length} payment intents in last ${hoursAgo} hours`);

      const orphanedPayments: any[] = [];
      const successfulWithBookings: any[] = [];

      for (const intent of paymentIntents.data) {
        if (intent.status === 'succeeded') {
          // IMPORTANT: Only process payments from 'oastel' platform to avoid mossyforestours bookings
          if (intent.metadata?.platform !== 'oastel') {
            console.log(`[RECOVERY] ⏭️ SKIPPING: Payment ${intent.id} from different platform (${intent.metadata?.platform || 'unknown'})`);
            continue;
          }

          // Check if booking exists for this payment intent
          const booking = await BookingModel.findOne({
            $or: [
              { 'paymentInfo.stripePaymentIntentId': intent.id },
              { 'paymentInfo.paymentIntentId': intent.id }
            ]
          });

          if (!booking) {
            console.log(`[RECOVERY] ⚠️ ORPHANED: Payment ${intent.id} succeeded but no booking found`);
            orphanedPayments.push({
              paymentIntentId: intent.id,
              amount: intent.amount / 100,
              currency: intent.currency,
              customerEmail: intent.metadata?.customerEmail,
              customerName: intent.metadata?.customerName,
              packageType: intent.metadata?.packageType,
              packageId: intent.metadata?.packageId,
              packageName: intent.metadata?.packageName || 'N/A',
              totalGuests: intent.metadata?.totalGuests || intent.metadata?.adults || '0',
              date: intent.metadata?.date,
              time: intent.metadata?.time,
              created: new Date(intent.created * 1000),
              metadata: intent.metadata
            });
          } else {
            successfulWithBookings.push({
              paymentIntentId: intent.id,
              bookingId: booking._id,
              status: 'ok'
            });
          }
        }
      }

      console.log(`[RECOVERY] ✅ ${successfulWithBookings.length} payments with bookings`);
      console.log(`[RECOVERY] ⚠️ ${orphanedPayments.length} orphaned payments`);

      res.json({
        success: true,
        summary: {
          totalScanned: paymentIntents.data.length,
          successfulWithBookings: successfulWithBookings.length,
          orphanedPayments: orphanedPayments.length,
          timeRange: `Last ${hoursAgo} hours`
        },
        orphanedPayments,
        message: orphanedPayments.length > 0 
          ? `Found ${orphanedPayments.length} orphaned payment(s). Use /recover-payment endpoint to create bookings.`
          : 'No orphaned payments found. All successful payments have corresponding bookings.'
      });

    } catch (error: any) {
      console.error('[RECOVERY] Error scanning orphaned payments:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to scan orphaned payments'
      });
    }
  }

  /**
   * Manually recover a specific payment by creating booking from payment intent
   * This is the main recovery endpoint for administrators
   */
  static async recoverPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      console.log(`[RECOVERY] 🔧 Attempting to recover payment: ${paymentIntentId}`);

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      console.log(`[RECOVERY] Payment status: ${paymentIntent.status}`);
      console.log(`[RECOVERY] Metadata:`, JSON.stringify(paymentIntent.metadata, null, 2));

      // Check if payment succeeded
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          error: `Payment intent status is '${paymentIntent.status}', not 'succeeded'. Cannot recover.`,
          paymentStatus: paymentIntent.status
        });
      }

      // Check if booking already exists
      const existingBooking = await BookingModel.findOne({
        $or: [
          { 'paymentInfo.stripePaymentIntentId': paymentIntentId },
          { 'paymentInfo.paymentIntentId': paymentIntentId }
        ]
      });

      if (existingBooking) {
        console.log(`[RECOVERY] ⚠️ Booking already exists: ${existingBooking._id}`);
        return res.json({
          success: true,
          message: 'Booking already exists for this payment',
          bookingId: existingBooking._id,
          alreadyExists: true
        });
      }

      // Attempt to create booking using BookingService
      const result = await BookingService.handleStripeSuccess({
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });

      if (result) {
        console.log(`[RECOVERY] ✅ Successfully recovered payment and created booking: ${result._id}`);
        
        res.json({
          success: true,
          message: 'Payment successfully recovered and booking created',
          bookingId: result._id,
          paymentIntentId: paymentIntent.id,
          customerEmail: paymentIntent.metadata?.customerEmail,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        });
      } else {
        throw new Error('Failed to create booking from payment intent');
      }

    } catch (error: any) {
      console.error('[RECOVERY] Error recovering payment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to recover payment',
        details: error.stack
      });
    }
  }

  /**
   * Get detailed information about a payment intent and its booking status
   */
  static async getPaymentDetails(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      console.log(`[RECOVERY] 📊 Getting details for payment: ${paymentIntentId}`);

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Check if booking exists
      const booking = await BookingModel.findOne({
        $or: [
          { 'paymentInfo.stripePaymentIntentId': paymentIntentId },
          { 'paymentInfo.paymentIntentId': paymentIntentId }
        ]
      }).populate('packageId');

      const response: any = {
        success: true,
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          created: new Date(paymentIntent.created * 1000),
          metadata: paymentIntent.metadata,
          paymentMethod: paymentIntent.payment_method_types,
          lastPaymentError: paymentIntent.last_payment_error
        },
        booking: booking ? {
          id: booking._id,
          status: booking.status,
          packageType: booking.packageType,
          packageName: booking.packageId?.name,
          date: booking.date,
          time: booking.time,
          customerEmail: booking.contactInfo.email,
          customerName: booking.contactInfo.name,
          paymentStatus: booking.paymentInfo.paymentStatus,
          createdAt: booking.createdAt
        } : null,
        analysis: {
          hasBooking: !!booking,
          paymentSucceeded: paymentIntent.status === 'succeeded',
          isOrphaned: paymentIntent.status === 'succeeded' && !booking,
          canRecover: paymentIntent.status === 'succeeded' && !booking,
          recommendation: paymentIntent.status === 'succeeded' && !booking
            ? 'This payment is orphaned. Use POST /api/recovery/recover-payment to create booking.'
            : booking
            ? 'Payment and booking are properly linked.'
            : 'Payment not successful or already has a booking.'
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('[RECOVERY] Error getting payment details:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get payment details'
      });
    }
  }

  /**
   * Batch recover multiple orphaned payments
   * Useful for recovering multiple failed bookings at once
   */
  static async batchRecover(req: Request, res: Response) {
    try {
      const { paymentIntentIds } = req.body;

      if (!Array.isArray(paymentIntentIds) || paymentIntentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array of payment intent IDs is required'
        });
      }

      console.log(`[RECOVERY] 🔧 Batch recovery for ${paymentIntentIds.length} payments`);

      const results: any[] = [];

      for (const paymentIntentId of paymentIntentIds) {
        try {
          console.log(`[RECOVERY] Processing: ${paymentIntentId}`);

          // Retrieve payment intent
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          if (paymentIntent.status !== 'succeeded') {
            results.push({
              paymentIntentId,
              success: false,
              error: `Payment status is ${paymentIntent.status}`
            });
            continue;
          }

          // Check if booking already exists
          const existingBooking = await BookingModel.findOne({
            $or: [
              { 'paymentInfo.stripePaymentIntentId': paymentIntentId },
              { 'paymentInfo.paymentIntentId': paymentIntentId }
            ]
          });

          if (existingBooking) {
            results.push({
              paymentIntentId,
              success: true,
              bookingId: existingBooking._id,
              message: 'Booking already exists'
            });
            continue;
          }

          // Attempt recovery
          const booking = await BookingService.handleStripeSuccess({
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata
          });

          results.push({
            paymentIntentId,
            success: !!booking,
            bookingId: booking?._id,
            message: booking ? 'Booking created successfully' : 'Failed to create booking'
          });

        } catch (error: any) {
          console.error(`[RECOVERY] Error processing ${paymentIntentId}:`, error);
          results.push({
            paymentIntentId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        },
        results
      });

    } catch (error: any) {
      console.error('[RECOVERY] Error in batch recovery:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to perform batch recovery'
      });
    }
  }
}
