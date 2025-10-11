import { Request, Response } from 'express';

// Import Stripe using require to avoid module resolution issues on some systems
const Stripe = require('stripe');

// Validate that Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

export class PaymentCleanupService {
  /**
   * Clean up abandoned payment intents that are older than specified minutes
   * This prevents payment intents from showing as "incomplete" in Stripe dashboard
   */
  static async cleanupAbandonedPaymentIntents(olderThanMinutes: number = 30): Promise<void> {
    try {
      console.log(`[CLEANUP] Starting cleanup of payment intents older than ${olderThanMinutes} minutes...`);
      
      // Calculate timestamp for the cutoff time
      const cutoffTime = Math.floor(Date.now() / 1000) - (olderThanMinutes * 60);
      
      // List payment intents that are in incomplete states and older than cutoff
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        created: {
          lt: cutoffTime,
        },
      });

      const abandonedIntents = paymentIntents.data.filter((intent: any) => 
        intent.status === 'requires_payment_method' ||
        intent.status === 'requires_confirmation' ||
        intent.status === 'requires_action'
      );

      console.log(`[CLEANUP] Found ${abandonedIntents.length} abandoned payment intents to clean up`);

      for (const intent of abandonedIntents) {
        try {
          // Check if this payment intent has any associated booking metadata
          const hasBookingData = intent.metadata?.bookingId || intent.metadata?.bookingType;
          
          if (hasBookingData) {
            // Skip payment intents that have booking associations to avoid interfering with actual bookings
            console.log(`[CLEANUP] Skipping payment intent ${intent.id} - has booking associations`);
            continue;
          }

          // Cancel the abandoned payment intent
          await stripe.paymentIntents.cancel(intent.id);
          console.log(`[CLEANUP] ✅ Canceled abandoned payment intent: ${intent.id}`);
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.error(`[CLEANUP] ❌ Failed to cancel payment intent ${intent.id}:`, error.message);
        }
      }

      console.log(`[CLEANUP] Cleanup completed. Processed ${abandonedIntents.length} payment intents.`);
      
    } catch (error: any) {
      console.error('[CLEANUP] Error during payment intent cleanup:', error);
    }
  }

  /**
   * Start automatic cleanup service that runs every specified interval
   */
  static startAutoCleanup(intervalMinutes: number = 60, cleanupOlderThanMinutes: number = 30): void {
    console.log(`[CLEANUP] Starting automatic payment intent cleanup service...`);
    console.log(`[CLEANUP] Will run every ${intervalMinutes} minutes, cleaning intents older than ${cleanupOlderThanMinutes} minutes`);
    
    // Run initial cleanup
    this.cleanupAbandonedPaymentIntents(cleanupOlderThanMinutes);
    
    // Set up recurring cleanup
    setInterval(() => {
      this.cleanupAbandonedPaymentIntents(cleanupOlderThanMinutes);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Express endpoint for manual cleanup trigger
   */
  static async triggerManualCleanup(req: Request, res: Response): Promise<void> {
    try {
      const { olderThanMinutes = 30 } = req.body;
      
      console.log('[CLEANUP] Manual cleanup triggered via API');
      await PaymentCleanupService.cleanupAbandonedPaymentIntents(olderThanMinutes);
      
      res.json({
        success: true,
        message: `Cleanup completed for payment intents older than ${olderThanMinutes} minutes`
      });
    } catch (error: any) {
      console.error('[CLEANUP] Manual cleanup failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Cleanup failed'
      });
    }
  }
}