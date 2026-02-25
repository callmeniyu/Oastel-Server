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
        description: `Booking for ${bookingData.packageType} - ${bookingData.contactInfo?.name || 'Guest'}`,
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

      // Payment successful - update existing bookings and send confirmation emails
      console.log('[PAYMENT] Payment successful, updating existing bookings...');

      // Import booking models and services
      const Booking = require('../models/Booking').default;

      let bookingResult;

      if (paymentIntent.metadata.bookingType === 'cart') {
        // Handle cart booking - find existing bookings by payment intent ID
        console.log('[PAYMENT] Cart booking - finding existing bookings...');
        
        const existingBookings = await Booking.find({
          $or: [
            { 'paymentInfo.stripePaymentIntentId': paymentIntent.id },
            { 'paymentInfo.paymentIntentId': paymentIntent.id }
          ],
          'paymentInfo.paymentStatus': 'pending'
        });

        console.log('[PAYMENT] Found existing bookings:', existingBookings.length);

        if (existingBookings.length === 0) {
          // No existing bookings found, create new ones using cart service
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
          
          // Fetch the actual booking documents for email sending
          const createdBookings = cartResult.bookings.length > 0 
            ? await Booking.find({ _id: { $in: cartResult.bookings } })
            : [];
          
          bookingResult = {
            success: cartResult.success,
            bookingIds: cartResult.bookings,
            totalBookings: cartResult.bookings.length,
            error: cartResult.errors.length > 0 ? cartResult.errors.join(', ') : null,
            data: createdBookings
          };
        } else {
          // Update existing bookings payment status AND update slot counts
          const updateResult = await Booking.updateMany(
            { $or: [ { 'paymentInfo.stripePaymentIntentId': paymentIntent.id }, { 'paymentInfo.paymentIntentId': paymentIntent.id } ] },
            { 
              $set: { 
                'paymentInfo.paymentStatus': 'succeeded',
                'paymentInfo.paymentMethod': 'stripe',
                'paymentInfo.stripePaymentIntentId': paymentIntent.id,
                'paymentInfo.paymentIntentId': paymentIntent.id,
                'status': 'confirmed'
              }
            }
          );

          console.log('[PAYMENT] Updated', updateResult.modifiedCount, 'existing bookings');

          // Update slot counts for each existing booking (now that payment is confirmed)
          try {
            const { TimeSlotService } = require('../services/timeSlot.service');
            for (const booking of existingBookings) {
              const totalGuests = (booking.adults || 0) + (booking.children || 0);
              
              // Convert booking date to YYYY-MM-DD Malaysia timezone for timeslot lookup
              let dateStr: string;
              if (booking.date instanceof Date) {                // Import formatDateAsMalaysiaTimezone at the top of this file
                const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
                dateStr = formatDateAsMalaysiaTimezone(booking.date);
              } else if (typeof booking.date === 'string' && booking.date.includes('T')) {
                dateStr = booking.date.split('T')[0];
              } else {
                dateStr = String(booking.date);
              }
              // Normalize to Malaysia timezone format using service util
              dateStr = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);
              
              console.log(`[PAYMENT] Converting booking date: ${booking.date} → ${dateStr}`);
              
              await TimeSlotService.updateSlotBooking(
                booking.packageType,
                booking.packageId,
                dateStr,
                booking.time,
                totalGuests,
                'add'
              );
              console.log(`[PAYMENT] ✅ Updated slot for cart booking ${booking._id}`);
            }
          } catch (slotError) {
            console.error('[PAYMENT] ❌ Failed to update slots for cart bookings:', slotError);
          }

          bookingResult = {
            success: true,
            bookingIds: existingBookings.map((b: any) => b._id),
            totalBookings: existingBookings.length,
            data: existingBookings
          };
        }

        // ⚠️ NOTE: Cart confirmation emails are already sent by cartBooking.service.ts
        // after creating bookings. Do not send duplicate emails here.
        // Commenting out to prevent duplicate email issue.
        /*
        // Send cart confirmation email after payment success
        if (bookingResult.success && bookingData?.contactInfo?.email) {
          try {
            // Fetch package details for proper package names in email
            const bookingsWithPackageNames = await Promise.all(
              bookingResult.data.map(async (booking: any) => {
                let packageName = booking.packageType === 'tour' ? 'Tour Package' : 'Transfer Service';
                
                try {
                  if (booking.packageType === 'tour') {
                    const mongoose = require('mongoose');
                    const TourModel = mongoose.model('Tour');
                    const packageDetails = await TourModel.findById(booking.packageId);
                    packageName = packageDetails?.title || packageName;
                  } else if (booking.packageType === 'transfer') {
                    const mongoose = require('mongoose');
                    const TransferModel = mongoose.model('Transfer');
                    const packageDetails = await TransferModel.findById(booking.packageId);
                    packageName = packageDetails?.title || packageName;
                  }
                } catch (packageError) {
                  console.warn(`[PAYMENT] Could not fetch package details for ${booking.packageId}:`, packageError);
                }

                return {
                  bookingId: booking._id.toString(),
                  packageId: booking.packageId,
                  packageName,
                  packageType: booking.packageType,
                  date: booking.date,
                  time: booking.time,
                  adults: booking.adults,
                  children: booking.children || 0,
                  pickupLocation: booking.pickupLocation,
                  total: booking.total,
                  currency: booking.paymentInfo?.currency || 'MYR'
                };
              })
            );

            // Prepare cart email data
            const cartEmailData = {
              customerName: bookingData.contactInfo.name,
              customerEmail: bookingData.contactInfo.email,
              bookings: bookingsWithPackageNames,
              totalAmount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase()
            };

            console.log('[PAYMENT] Sending cart confirmation email...');
            console.log('[PAYMENT] Email recipient:', cartEmailData.customerEmail);
            console.log('[PAYMENT] Total bookings:', cartEmailData.bookings.length);
            
            // Check email configuration before attempting to send
            const emailConfig = PaymentController.checkEmailConfiguration();
            console.log('[PAYMENT] Email config check:', emailConfig);
            
            if (!emailConfig.canSendEmail) {
              console.error('[PAYMENT] ❌ Cannot send email - configuration issues:', emailConfig.issues);
              throw new Error(`Email configuration incomplete: ${emailConfig.issues.join(', ')}`);
            }
            
            const emailService = new EmailService();
            const emailSent = await emailService.sendCartBookingConfirmation(cartEmailData);
            
            if (emailSent) {
              console.log('[PAYMENT] ✅ Cart confirmation email sent successfully');
            } else {
              console.error('[PAYMENT] ⚠️ Cart confirmation email failed to send');
            }
          } catch (emailError) {
            console.error('[PAYMENT] ❌ Failed to send cart confirmation email:', emailError);
            // Log additional debug info
            console.error('[PAYMENT] Email error details:', {
              customerEmail: bookingData?.contactInfo?.email,
              bookingCount: bookingResult?.data?.length,
              hasBrevoKey: !!process.env.BREVO_API_KEY,
              hasSmtpConfig: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
            });
          }
        }
        */

      } else {
        // Handle single booking - find existing booking by payment intent ID
        console.log('[PAYMENT] Single booking - finding existing booking...');
        
        // First check if this payment intent already has a confirmed booking
        const alreadyConfirmedBooking = await Booking.findOne({
          $or: [
            { 'paymentInfo.stripePaymentIntentId': paymentIntent.id },
            { 'paymentInfo.paymentIntentId': paymentIntent.id }
          ],
          'paymentInfo.paymentStatus': 'succeeded'
        });

        if (alreadyConfirmedBooking) {
          console.log('[PAYMENT] ⚠️ Payment intent already has a confirmed booking:', alreadyConfirmedBooking._id);
          // Return success to prevent retry, but with existing booking
          return res.json({
            success: true,
            message: 'Payment already confirmed for this booking',
            data: {
              paymentIntentId: paymentIntent.id,
              paymentStatus: paymentIntent.status,
              bookingIds: [alreadyConfirmedBooking._id],
              totalBookings: 1,
              isDuplicate: true
            }
          });
        }

        // Check for duplicate bookings with same customer details within last 5 minutes
        if (paymentIntent.metadata.customerEmail && paymentIntent.metadata.date && paymentIntent.metadata.time) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const potentialDuplicates = await Booking.find({
            'contactInfo.email': paymentIntent.metadata.customerEmail,
            'packageId': paymentIntent.metadata.packageId,
            'date': paymentIntent.metadata.date,
            'time': paymentIntent.metadata.time,
            'adults': parseInt(paymentIntent.metadata.adults || '0'),
            'paymentInfo.paymentStatus': 'succeeded',
            'createdAt': { $gte: fiveMinutesAgo }
          });

          if (potentialDuplicates.length > 0) {
            console.log('[PAYMENT] ⚠️ Found potential duplicate booking(s):', potentialDuplicates.map((b: any) => b._id));
            // Return the existing booking instead of creating duplicate
            return res.json({
              success: true,
              message: 'Duplicate booking prevented - returning existing booking',
              data: {
                paymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status,
                bookingIds: [potentialDuplicates[0]._id],
                totalBookings: 1,
                isDuplicate: true
              }
            });
          }
        }
        
        const existingBooking = await Booking.findOne({
          'paymentInfo.paymentIntentId': paymentIntent.id,
          'paymentInfo.paymentStatus': 'pending'
        });

        if (existingBooking) {
          // Update existing booking payment status AND update slot counts
          existingBooking.paymentInfo.paymentStatus = 'succeeded';
          existingBooking.paymentInfo.paymentMethod = 'stripe';
          existingBooking.paymentInfo.stripePaymentIntentId = paymentIntent.id;
          existingBooking.status = 'confirmed';
          const savedBooking = await existingBooking.save();

          console.log('[PAYMENT] Updated existing booking:', savedBooking._id);

          // Update slot counts for existing booking (now that payment is confirmed)
          try {
            const { TimeSlotService } = require('../services/timeSlot.service');
            const totalGuests = (existingBooking.adults || 0) + (existingBooking.children || 0);
            
            // Convert booking date to YYYY-MM-DD Malaysia timezone for timeslot lookup
            let dateStr: string;
            if (existingBooking.date instanceof Date) {
              const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
              dateStr = formatDateAsMalaysiaTimezone(existingBooking.date);
            } else if (typeof existingBooking.date === 'string' && existingBooking.date.includes('T')) {
              dateStr = existingBooking.date.split('T')[0];
            } else {
              dateStr = String(existingBooking.date);
            }
            dateStr = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);
            
            console.log(`[PAYMENT] Converting booking date: ${existingBooking.date} → ${dateStr}`);
            
            await TimeSlotService.updateSlotBooking(
              existingBooking.packageType,
              existingBooking.packageId,
              dateStr,
              existingBooking.time,
              totalGuests,
              'add'
            );
            console.log('[PAYMENT] ✅ Updated slot for single booking:', savedBooking._id);
          } catch (slotError) {
            console.error('[PAYMENT] ❌ Failed to update slot for single booking:', slotError);
          }

          bookingResult = {
            success: true,
            data: savedBooking,
            bookingIds: [savedBooking._id]
          };
        } else {
          // No existing booking found, create new one
          // CRITICAL: Parse date as Malaysia timezone to avoid off-by-one day errors
          const parsedDate = typeof bookingData.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bookingData.date)
            ? parseDateAsMalaysiaTimezone(bookingData.date)
            : new Date(bookingData.date);
          
          const finalBookingData = {
            ...bookingData,
            date: parsedDate, // Use parsed date instead of raw date string
            status: 'confirmed',
            paymentInfo: {
              paymentIntentId: paymentIntent.id,
              stripePaymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              paymentStatus: 'succeeded',
              paymentMethod: 'stripe',
              bankCharge: Math.round((paymentIntent.amount / 100) * 0.028 * 100) / 100
            }
          };

          const booking = new Booking(finalBookingData);
          const savedBooking = await booking.save();

          // Update slot counts for new booking created after payment
          try {
            const { TimeSlotService } = require('../services/timeSlot.service');
            const totalGuests = (bookingData.adults || 0) + (bookingData.children || 0);
            
            // Convert booking date to YYYY-MM-DD Malaysia timezone for timeslot lookup
            let dateStr: string;
            if (bookingData.date instanceof Date) {
              const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
              dateStr = formatDateAsMalaysiaTimezone(bookingData.date);
            } else if (typeof bookingData.date === 'string' && bookingData.date.includes('T')) {
              dateStr = bookingData.date.split('T')[0];
            } else {
              dateStr = String(bookingData.date);
            }
            dateStr = TimeSlotService.formatDateToMalaysiaTimezone(dateStr);
            
            console.log(`[PAYMENT] Converting booking date: ${bookingData.date} → ${dateStr}`);
            
            await TimeSlotService.updateSlotBooking(
              bookingData.packageType,
              bookingData.packageId,
              dateStr,
              bookingData.time,
              totalGuests,
              'add'
            );
            console.log('[PAYMENT] ✅ Slot updated for new booking created after payment');
          } catch (slotError) {
            console.error('[PAYMENT] ❌ Failed to update slot for new booking:', slotError);
          }

          bookingResult = {
            success: true,
            data: savedBooking,
            bookingIds: [savedBooking._id]
          };
        }

        // Send single booking confirmation email after payment success
        if (bookingResult.success && bookingData?.contactInfo?.email) {
          try {
            // Get package details for email
            let packageDetails: any = null;
            if (bookingData.packageType === 'tour') {
              const mongoose = require('mongoose');
              const TourModel = mongoose.model('Tour');
              packageDetails = await TourModel.findById(bookingData.packageId);
            } else if (bookingData.packageType === 'transfer') {
              const mongoose = require('mongoose');
              const TransferModel = mongoose.model('Transfer');
              packageDetails = await TransferModel.findById(bookingData.packageId);
            }

            const emailData: any = {
              customerName: bookingData.contactInfo.name,
              customerEmail: bookingData.contactInfo.email,
              customerPhone: bookingData.contactInfo.phone,
              customerWhatsapp: bookingData.contactInfo.whatsapp || bookingData.contactInfo.phone,
              bookingId: bookingResult.data._id.toString(),
              packageId: bookingData.packageId,
              packageName: packageDetails?.title || (bookingData.packageType === 'tour' ? 'Tour Package' : 'Transfer Service'),
              packageType: bookingData.packageType,
              date: bookingData.date,
              time: bookingData.time,
              adults: bookingData.adults,
              children: bookingData.children || 0,
              pickupLocation: bookingData.pickupLocation,
              total: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase()
            };

            // Add transfer-specific details
            if (bookingData.packageType === 'transfer' && packageDetails) {
              emailData.from = packageDetails.from;
              emailData.to = packageDetails.to;
              
              if (packageDetails.type === 'Private') {
                emailData.isVehicleBooking = true;
                emailData.vehicleName = packageDetails.vehicle;
                emailData.vehicleSeatCapacity = packageDetails.seatCapacity;
              }
            }

            // Add vehicle information for private tours
            if (bookingData.packageType === 'tour' && packageDetails && packageDetails.type === 'private') {
              emailData.isVehicleBooking = true;
              emailData.vehicleName = packageDetails.vehicle;
              emailData.vehicleSeatCapacity = packageDetails.seatCapacity;
            }

            console.log('[PAYMENT] Sending single booking confirmation email...');
            console.log('[PAYMENT] Email recipient:', emailData.customerEmail);
            console.log('[PAYMENT] Package:', emailData.packageName);
            
            // Check email configuration before attempting to send
            const emailConfig = PaymentController.checkEmailConfiguration();
            console.log('[PAYMENT] Email config check:', emailConfig);
            
            if (!emailConfig.canSendEmail) {
              console.error('[PAYMENT] ❌ Cannot send email - configuration issues:', emailConfig.issues);
              throw new Error(`Email configuration incomplete: ${emailConfig.issues.join(', ')}`);
            }
            
            const emailService = new EmailService();
            const emailSent = await emailService.sendBookingConfirmation(emailData);
            
            if (emailSent) {
              console.log('[PAYMENT] ✅ Single booking confirmation email sent successfully');
            } else {
              console.error('[PAYMENT] ⚠️ Single booking confirmation email failed to send');
            }
          } catch (emailError) {
            console.error('[PAYMENT] ❌ Failed to send single booking confirmation email:', emailError);
            // Log additional debug info
            console.error('[PAYMENT] Email error details:', {
              customerEmail: bookingData?.contactInfo?.email,
              packageType: bookingData?.packageType,
              packageId: bookingData?.packageId,
              hasBrevoKey: !!process.env.BREVO_API_KEY,
              hasSmtpConfig: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
            });
          }
        }
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
