import { Request, Response } from 'express';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export class PaymentDebugController {
  // Debug payment intent and check booking status
  static async debugPayment(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
      }

      console.log(`[DEBUG] Checking payment intent: ${paymentIntentId}`);

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log(`[DEBUG] Payment intent details:`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        created: new Date(paymentIntent.created * 1000),
        last_payment_error: paymentIntent.last_payment_error
      });

      // Check if booking exists
      const Booking = require('../models/Booking').default;
      const booking = await Booking.findOne({ 'paymentInfo.paymentIntentId': paymentIntentId });
      
      let debugInfo: any = {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          created: new Date(paymentIntent.created * 1000),
          last_payment_error: paymentIntent.last_payment_error
        },
        booking: booking ? {
          id: booking._id,
          status: booking.status,
          packageType: booking.packageType,
          packageTitle: booking.packageTitle,
          contactInfo: booking.contactInfo,
          paymentInfo: booking.paymentInfo,
          createdAt: booking.createdAt
        } : null,
        summary: {
          paymentSuccessful: paymentIntent.status === 'succeeded',
          bookingExists: !!booking,
          bookingCreated: !!booking,
          requiresAction: paymentIntent.status === 'succeeded' && !booking
        }
      };

      // If payment succeeded but no booking, check cart and user
      if (paymentIntent.status === 'succeeded' && !booking && paymentIntent.metadata.bookingType === 'cart') {
        const User = require('../models/User').default;
        const Cart = require('../models/Cart').default;
        
        const user = await User.findOne({ email: paymentIntent.metadata.userEmail });
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        
        debugInfo = {
          ...debugInfo,
          cartDebug: {
            userEmail: paymentIntent.metadata.userEmail,
            userExists: !!user,
            userId: user?._id,
            cartExists: !!cart,
            cartItems: cart?.items?.length || 0,
            cartItemDetails: cart?.items?.map((item: any) => ({
              packageId: item.packageId,
              packageType: item.packageType,
              packageTitle: item.packageTitle,
              selectedDate: item.selectedDate,
              selectedTime: item.selectedTime,
              totalPrice: item.totalPrice
            })) || []
          }
        };
      }

      res.json({
        success: true,
        data: debugInfo
      });

    } catch (error: any) {
      console.error('[DEBUG] Error debugging payment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to debug payment'
      });
    }
  }

  // Retry booking creation for a successful payment
  static async retryBookingCreation(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;
      const { bookingData } = req.body;
      
      console.log(`[RETRY] Retrying booking creation for payment: ${paymentIntentId}`);

      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          error: 'Payment was not successful',
          paymentStatus: paymentIntent.status
        });
      }

      // Check if booking already exists
      const Booking = require('../models/Booking').default;
      const existingBooking = await Booking.findOne({ 'paymentInfo.paymentIntentId': paymentIntentId });
      
      if (existingBooking) {
        return res.json({
          success: true,
          message: 'Booking already exists',
          data: {
            bookingId: existingBooking._id,
            paymentIntentId: paymentIntent.id
          }
        });
      }

      // Retry booking creation
      let bookingResult;

      if (paymentIntent.metadata.bookingType === 'cart') {
        // Handle cart booking
        const { cartBookingService } = require('../services/cartBooking.service');
        
        const cartBookingRequest = {
          userEmail: paymentIntent.metadata.userEmail,
          contactInfo: bookingData.contactInfo,
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            paymentStatus: 'succeeded',
            paymentMethod: 'stripe'
          }
        };

        const cartResult = await cartBookingService.bookCartItems(cartBookingRequest);
        
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
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            paymentStatus: 'succeeded',
            paymentMethod: 'stripe',
            bankCharge: Math.round((paymentIntent.amount / 100) * 0.028 * 100) / 100
          }
        };

        const booking = new Booking(finalBookingData);
        const savedBooking = await booking.save();
        
        bookingResult = {
          success: true,
          data: savedBooking,
          bookingIds: [savedBooking._id]
        };
      }

      res.json({
        success: bookingResult.success,
        message: bookingResult.success ? 'Booking created successfully' : 'Failed to create booking',
        data: {
          paymentIntentId: paymentIntent.id,
          bookingIds: bookingResult.bookingIds,
          error: bookingResult.error
        }
      });

    } catch (error: any) {
      console.error('[RETRY] Error retrying booking creation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retry booking creation'
      });
    }
  }
}
