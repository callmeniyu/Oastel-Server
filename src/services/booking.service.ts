import BookingModel, { Booking } from "../models/Booking";
import TimeSlotModel from "../models/TimeSlot";
import { TimeSlotService } from "./timeSlot.service";
import { EmailService } from "./email.service";
import mongoose from "mongoose";

class BookingService {
  // Mark confirmed bookings as completed if their date/time is in the past
  // NOTE: This should be called by a scheduled cron job, not on every page load
  async markPastBookingsCompleted(additionalFilter: any = {}) {
    try {
      const now = new Date();
      // Find bookings that are confirmed and whose date is before today (end of that day)
      const bookingsToComplete = await BookingModel.find({
        status: 'confirmed',
        ...additionalFilter,
        date: { $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
      }).select('_id');

      if (bookingsToComplete.length === 0) return;

      const ids = bookingsToComplete.map(b => b._id);
      await BookingModel.updateMany({ _id: { $in: ids } }, { $set: { status: 'completed' } });
      console.log(`✅ Marked ${ids.length} booking(s) as completed`);
    } catch (err) {
      console.error('Error marking past bookings completed:', err);
    }
  }
  // Create a new booking directly with contact info (for guests)
  async createBookingDirect(data: {
    packageType: "tour" | "transfer";
    packageId: mongoose.Types.ObjectId;
    date: Date;
    time: string;
    adults: number;
    children: number;
    pickupLocation: string;
    contactInfo: {
      name: string;
      email: string;
      phone: string;
      whatsapp?: string;
    };
    subtotal: number;
    total: number;
    paymentInfo: {
      amount: number;
      bankCharge: number;
      currency: string;
      paymentStatus: string;
    };
    isVehicleBooking?: boolean;
    vehicleSeatCapacity?: number;
  }): Promise<Booking> {
    try {
      // Get package details to check minimum person requirement
      let packageDetails: any = null;
      if (data.packageType === 'tour') {
        const TourModel = mongoose.model('Tour');
        packageDetails = await TourModel.findById(data.packageId);
      } else if (data.packageType === 'transfer') {
        const TransferModel = mongoose.model('Transfer');
        packageDetails = await TransferModel.findById(data.packageId);
      }

      if (!packageDetails) {
        throw new Error("Package not found");
      }

      // First, try to find or create a user for this email
      let userId: mongoose.Types.ObjectId | null = null;
      
      try {
        const UserModel = mongoose.model('User');
        let user = await UserModel.findOne({ email: data.contactInfo.email });
        
        if (!user) {
          // Create new user for this booking
          console.log(`Creating new user for email: ${data.contactInfo.email}`);
          user = new UserModel({
            name: data.contactInfo.name,
            email: data.contactInfo.email,
            phone: data.contactInfo.phone,
            role: 'user',
            isVerified: true, // Mark as verified since they're making a booking
            createdAt: new Date()
          });
          await user.save();
          console.log(`✅ Created user with ID: ${user._id}`);
        } else {
          console.log(`👤 Found existing user with ID: ${user._id}`);
        }
        
        userId = user._id;
      } catch (userError) {
        console.error('Error creating/finding user:', userError);
        // Continue without userId if user creation fails
        console.log('⚠️ Continuing with guest booking (no user ID)');
      }

  const totalGuests = data.adults + data.children;
      
      // Check slot availability using TimeSlotService (includes minimum person validation)
      // For vehicle bookings, requestedPersons should be treated as 1 (one vehicle)
      const requestedPersons = data.isVehicleBooking ? 1 : totalGuests;
      // Ensure we use Malaysia-local date string for slot lookups (avoid UTC shift)
      const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
      const slotDateStr = formatDateAsMalaysiaTimezone(data.date);

      const availability = await TimeSlotService.checkAvailability(
        data.packageType,
        data.packageId,
        slotDateStr,
        data.time,
        requestedPersons
      );

      if (!availability.available) {
        throw new Error(availability.reason || "Time slot not available");
      }

      // Create booking with userId (if found/created) and slotId (for guest bookings using dynamic slots)
      const booking = new BookingModel({
        userId: userId, // Link to user if found/created
        packageType: data.packageType,
        packageId: data.packageId,
        slotId: null, // No specific slot for guest bookings using dynamic slots
        date: data.date,
        time: data.time,
        adults: data.adults,
        children: data.children,
        pickupLocation: data.pickupLocation,
        status: data.paymentInfo.paymentStatus === 'succeeded' ? 'confirmed' : 'pending', // Auto-confirm if payment succeeded
        contactInfo: data.contactInfo,
        // Persist paymentInfo and any Stripe identifiers so webhooks can reconcile
        paymentInfo: {
          ...data.paymentInfo,
          stripePaymentIntentId: (data.paymentInfo as any)?.stripePaymentIntentId || null,
          stripeSessionId: (data.paymentInfo as any)?.stripeSessionId || null,
        },
        subtotal: data.subtotal,
        total: data.total,
        firstBookingMinimum: false, // Can be calculated based on business logic
        isVehicleBooking: data.isVehicleBooking || false,
        vehicleSeatCapacity: data.vehicleSeatCapacity
      });

      const savedBooking = await booking.save();

      // Update slot booking count using TimeSlotService and package bookedCount
      const PackageModel = data.packageType === 'tour' ? mongoose.model('Tour') : mongoose.model('Transfer');
      const pkg = await PackageModel.findById(data.packageId);
      const isPrivate = pkg && (pkg.type === 'Private' || pkg.type === 'private');

    if (isPrivate && data.packageType === 'transfer') {
        // For private transfers, treat as one vehicle booking
        await TimeSlotService.updateSlotBooking(
          data.packageType,
          data.packageId,
          slotDateStr,
          data.time,
          1, // one vehicle
          "add"
        );
        const TransferModel = mongoose.model('Transfer');
        await TransferModel.findByIdAndUpdate(
          data.packageId,
          { $inc: { bookedCount: 1 } }
        );
        console.log(`✅ Updated Transfer bookedCount by 1 for package ${data.packageId}`);
    } else {
        // Non-private: update by total guests
        await TimeSlotService.updateSlotBooking(
          data.packageType,
          data.packageId,
          slotDateStr,
          data.time,
          totalGuests,
          "add"
        );
        if (data.packageType === 'tour') {
          const TourModel = mongoose.model('Tour');
          await TourModel.findByIdAndUpdate(
            data.packageId,
            { $inc: { bookedCount: totalGuests } }
          );
          console.log(`✅ Updated Tour bookedCount by ${totalGuests} for package ${data.packageId}`);
        } else if (data.packageType === 'transfer') {
          const TransferModel = mongoose.model('Transfer');
          await TransferModel.findByIdAndUpdate(
            data.packageId,
            { $inc: { bookedCount: totalGuests } }
          );
          console.log(`✅ Updated Transfer bookedCount by ${totalGuests} for package ${data.packageId}`);
        }
      }

      return savedBooking;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  // Idempotent handler for Stripe successful payments
  // ENHANCED: Creates bookings from metadata if no existing booking found
  async handleStripeSuccess(opts: { bookingId?: string; paymentIntentId?: string; sessionId?: string; amount?: number; currency?: string; metadata?: any; }) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[WEBHOOK] 🔄 Processing payment success (attempt ${attempt}/${MAX_RETRIES})`);
        console.log(`[WEBHOOK] Payment Intent ID: ${opts.paymentIntentId}`);
        console.log(`[WEBHOOK] Booking ID from metadata: ${opts.bookingId || 'NOT PROVIDED'}`);

        const filter: any = {};
        if (opts.bookingId) filter._id = opts.bookingId;
        if (opts.paymentIntentId) filter['paymentInfo.stripePaymentIntentId'] = opts.paymentIntentId;
        if (opts.sessionId) filter['paymentInfo.stripeSessionId'] = opts.sessionId;

        // Only update if not already marked succeeded
        const update: any = {
          'paymentInfo.paymentStatus': 'succeeded',
          status: 'confirmed',
          'paymentInfo.updatedAt': new Date(),
        };

        if (typeof opts.amount === 'number') update['paymentInfo.amount'] = opts.amount;
        if (opts.currency) update['paymentInfo.currency'] = opts.currency;

        let booking = await BookingModel.findOneAndUpdate(
          { ...filter, $or: [ { 'paymentInfo.paymentStatus': { $exists: false } }, { 'paymentInfo.paymentStatus': { $ne: 'succeeded' } } ] },
          { $set: update },
          { new: true }
        ).populate('packageId');

        // CRITICAL FIX: If no booking found, create one from payment intent metadata
        if (!booking && opts.metadata) {
          console.log(`[WEBHOOK] ⚠️ No existing booking found. Attempting to create from metadata...`);
          console.log(`[WEBHOOK] Metadata:`, JSON.stringify(opts.metadata, null, 2));
          
          booking = await this.createBookingFromMetadata(opts.metadata, opts.paymentIntentId!, opts.amount, opts.currency);
          
          if (booking) {
            console.log(`[WEBHOOK] ✅ Booking ${booking._id} created from webhook metadata`);
          } else {
            console.error(`[WEBHOOK] ❌ Failed to create booking from metadata`);
            throw new Error('Failed to create booking from metadata');
          }
        }

        if (booking) {
          console.log(`[WEBHOOK] ✅ Booking ${booking._id} marked confirmed via Stripe event`);
          
          // Send confirmation email using existing Brevo service
          try {
            const emailService = new EmailService();
            
            // Prepare email data for existing email service
            const emailData = {
              customerName: booking.contactInfo.name,
              customerEmail: booking.contactInfo.email,
              bookingId: booking._id.toString(),
              packageId: booking.packageId._id.toString(),
              packageName: booking.packageId.name,
              packageType: booking.packageType,
              from: booking.from,
              to: booking.to,
              date: (() => {
                const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
                return formatDateAsMalaysiaTimezone(booking.date);
              })(), // Format date as YYYY-MM-DD in Malaysia timezone
              time: booking.time,
              adults: booking.adults,
              children: booking.children,
              pickupLocation: booking.pickupLocation,
              pickupGuidelines: booking.packageId.pickupGuidelines,
              total: booking.total,
              currency: booking.paymentInfo.currency || 'MYR',
              isVehicleBooking: booking.isVehicleBooking,
              vehicleName: booking.vehicleName,
              vehicleSeatCapacity: booking.vehicleSeatCapacity,
            };
            
            const emailSent = await emailService.sendBookingConfirmation(emailData);
            if (emailSent) {
              console.log(`[WEBHOOK] 📧 Confirmation email sent to ${booking.contactInfo.email} for booking ${booking._id}`);
            } else {
              console.warn(`[WEBHOOK] ⚠️ Failed to send confirmation email for booking ${booking._id}`);
            }
          } catch (emailError) {
            console.error(`[WEBHOOK] ❌ Error sending confirmation email for booking ${booking._id}:`, emailError);
            // Don't fail the payment processing if email fails
          }
        } else {
          console.error(`[WEBHOOK] ❌ No booking found or created for payment ${opts.paymentIntentId}`);
        }

        return booking;
      } catch (err: any) {
        console.error(`[WEBHOOK] Error in handleStripeSuccess (attempt ${attempt}/${MAX_RETRIES}):`, err);
        
        // Check if it's a network/timeout error that's worth retrying
        const isRetryableError = err.name === 'MongoNetworkError' || 
                                err.name === 'MongoNetworkTimeoutError' ||
                                err.message?.includes('timeout') ||
                                err.message?.includes('ECONNRESET');
        
        if (attempt < MAX_RETRIES && isRetryableError) {
          console.log(`[WEBHOOK] ⏳ Retrying in ${RETRY_DELAY}ms due to network error...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt)); // Exponential backoff
          continue;
        }
        
        // If not retryable or max retries reached, throw error
        throw err;
      }
    }
    
    throw new Error('Max retries reached for handleStripeSuccess');
  }

  // Create booking from payment intent metadata (webhook fallback)
  private async createBookingFromMetadata(metadata: any, paymentIntentId: string, amount?: number, currency?: string): Promise<any> {
    try {
      console.log(`[WEBHOOK] 🔧 Creating booking from metadata...`);

      // Extract required fields from metadata
      const packageType = metadata.packageType;
      const packageId = metadata.packageId;
      const date = metadata.date;
      const time = metadata.time;
      const adults = parseInt(metadata.adults || '1');
      const children = parseInt(metadata.children || '0');
      const customerEmail = metadata.customerEmail;
      const customerName = metadata.customerName;

      // Validate required fields
      if (!packageType || !packageId || !date || !time || !customerEmail || !customerName) {
        console.error(`[WEBHOOK] ❌ Missing required metadata fields:`, {
          packageType,
          packageId,
          date,
          time,
          customerEmail,
          customerName
        });
        return null;
      }

      // Parse date (handle ISO string)
      const { parseDateAsMalaysiaTimezone } = require('../utils/dateUtils');
      const bookingDate = date.includes('T') ? new Date(date) : parseDateAsMalaysiaTimezone(date);

      // Get package details
      const PackageModel = packageType === 'tour' ? mongoose.model('Tour') : mongoose.model('Transfer');
      const packageDetails = await PackageModel.findById(packageId);

      if (!packageDetails) {
        console.error(`[WEBHOOK] ❌ Package not found: ${packageId}`);
        return null;
      }

      // Calculate total from amount or package price
      const calculatedTotal = amount || (packageDetails.price * adults);

      // Create booking data - BYPASS TIME VALIDATION by using createBookingDirectWebhook
      const bookingData = {
        packageType,
        packageId: new mongoose.Types.ObjectId(packageId),
        date: bookingDate,
        time,
        adults,
        children,
        pickupLocation: metadata.pickupLocation || packageDetails.pickupLocation || 'To be confirmed',
        contactInfo: {
          name: customerName,
          email: customerEmail,
          phone: metadata.customerPhone || 'Not provided',
          whatsapp: metadata.customerWhatsapp || metadata.customerPhone || ''
        },
        subtotal: calculatedTotal,
        total: calculatedTotal,
        paymentInfo: {
          amount: calculatedTotal,
          bankCharge: Math.round(calculatedTotal * 0.028 * 100) / 100,
          currency: currency || 'MYR',
          paymentStatus: 'succeeded',
          stripePaymentIntentId: paymentIntentId,
          paymentMethod: 'stripe'
        },
        isVehicleBooking: packageDetails.type === 'Private',
        vehicleSeatCapacity: packageDetails.seatCapacity
      };

      console.log(`[WEBHOOK] 📝 Creating booking with data:`, {
        packageType,
        packageId,
        date: bookingDate,
        time,
        customerEmail,
        total: calculatedTotal
      });

      // Create booking using special webhook method that bypasses time validation
      const booking = await this.createBookingDirectWebhook(bookingData);
      
      return booking;
    } catch (error) {
      console.error(`[WEBHOOK] Error creating booking from metadata:`, error);
      return null;
    }
  }

  // Special booking creation method for webhooks - BYPASSES time validation
  private async createBookingDirectWebhook(data: any): Promise<any> {
    try {
      console.log(`[WEBHOOK] 🚀 Creating booking via webhook (bypassing time validation)...`);

      // Create user if doesn't exist
      let userId: mongoose.Types.ObjectId | null = null;
      
      try {
        const UserModel = mongoose.model('User');
        let user = await UserModel.findOne({ email: data.contactInfo.email });
        
        if (!user) {
          console.log(`[WEBHOOK] Creating new user for email: ${data.contactInfo.email}`);
          user = new UserModel({
            name: data.contactInfo.name,
            email: data.contactInfo.email,
            phone: data.contactInfo.phone,
            role: 'user',
            isVerified: true,
            createdAt: new Date()
          });
          await user.save();
          console.log(`[WEBHOOK] ✅ Created user with ID: ${user._id}`);
        }
        
        userId = user._id;
      } catch (userError) {
        console.error('[WEBHOOK] Error creating/finding user:', userError);
      }

      // Get package details
      const PackageModel = data.packageType === 'tour' ? mongoose.model('Tour') : mongoose.model('Transfer');
      const packageDetails = await PackageModel.findById(data.packageId);

      if (!packageDetails) {
        throw new Error('Package not found');
      }

      const totalGuests = data.adults + data.children;

      // CRITICAL: For webhooks, we SKIP time validation since payment already succeeded
      // Check only slot availability, not booking window
      const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
      const slotDateStr = formatDateAsMalaysiaTimezone(data.date);

      // Check basic availability without time restrictions
      const requestedPersons = data.isVehicleBooking ? 1 : totalGuests;
      const { checkAvailabilityWebhook } = require('./timeSlot.service');
      
      const availability = await TimeSlotService.checkAvailabilityWebhook(
        data.packageType,
        data.packageId,
        slotDateStr,
        data.time,
        requestedPersons
      );

      if (!availability.available) {
        console.warn(`[WEBHOOK] ⚠️ Slot not available but payment succeeded. Creating booking anyway.`);
        // Continue creating booking even if slot appears unavailable
      }

      // Create booking
      const booking = new BookingModel({
        userId: userId,
        packageType: data.packageType,
        packageId: data.packageId,
        slotId: null,
        date: data.date,
        time: data.time,
        adults: data.adults,
        children: data.children,
        pickupLocation: data.pickupLocation,
        status: 'confirmed', // Already confirmed since payment succeeded
        contactInfo: data.contactInfo,
        paymentInfo: data.paymentInfo,
        subtotal: data.subtotal,
        total: data.total,
        firstBookingMinimum: false,
        isVehicleBooking: data.isVehicleBooking || false,
        vehicleSeatCapacity: data.vehicleSeatCapacity
      });

      const savedBooking = await booking.save();
      console.log(`[WEBHOOK] ✅ Booking created with ID: ${savedBooking._id}`);

      // Update slot counts
      const isPrivate = packageDetails && (packageDetails.type === 'Private' || packageDetails.type === 'private');
      const updateCount = isPrivate && data.packageType === 'transfer' ? 1 : totalGuests;

      try {
        await TimeSlotService.updateSlotBooking(
          data.packageType,
          data.packageId,
          slotDateStr,
          data.time,
          updateCount,
          'add'
        );
        console.log(`[WEBHOOK] ✅ Updated slot booking count by ${updateCount}`);
      } catch (slotError) {
        console.error('[WEBHOOK] ⚠️ Failed to update slot count:', slotError);
        // Continue anyway - booking is created
      }

      // Update package bookedCount
      try {
        await PackageModel.findByIdAndUpdate(
          data.packageId,
          { $inc: { bookedCount: updateCount } }
        );
        console.log(`[WEBHOOK] ✅ Updated package bookedCount by ${updateCount}`);
      } catch (countError) {
        console.error('[WEBHOOK] ⚠️ Failed to update package count:', countError);
      }

      return savedBooking;
    } catch (error) {
      console.error('[WEBHOOK] Error creating booking via webhook:', error);
      throw error;
    }
  }

  // Idempotent handler for Stripe failed/cancelled payments
  async handleStripeFailure(opts: { bookingId?: string; paymentIntentId?: string; reason?: string; }) {
    try {
      const filter: any = {};
      if (opts.bookingId) filter._id = opts.bookingId;
      if (opts.paymentIntentId) filter['paymentInfo.stripePaymentIntentId'] = opts.paymentIntentId;

      const update: any = {
        'paymentInfo.paymentStatus': 'failed',
        'paymentInfo.failedReason': opts.reason || 'payment_failed',
        status: 'cancelled',
        'paymentInfo.updatedAt': new Date(),
      };

      const booking = await BookingModel.findOneAndUpdate(filter, { $set: update }, { new: true });
      if (booking) {
        console.log(`⚠️ Booking ${booking._id} marked failed/cancelled via Stripe event`);
        // Optionally notify customer/admin
      }
      return booking;
    } catch (err) {
      console.error('Error in handleStripeFailure:', err);
      throw err;
    }
  }

  // Create a new booking (original method for registered users)
  async createBooking(data: {
    userId: mongoose.Types.ObjectId;
    packageType: "tour" | "transfer";
    packageId: mongoose.Types.ObjectId;
    slotId: mongoose.Types.ObjectId;
    date: Date;
    time: string;
    adults: number;
    children: number;
    pickupLocation: string;
  }): Promise<Booking> {
    // Validate slot availability
    const slot = await TimeSlotModel.findById(data.slotId);
    if (!slot) {
      throw new Error("Time slot not found");
    }
    if (!slot.isAvailable) {
      throw new Error("Time slot is not available");
    }
    const totalRequested = data.adults + data.children;
    if (slot.booked + totalRequested > slot.capacity) {
      throw new Error("Not enough capacity in the selected time slot");
    }

    // Create booking with status pending
    const booking = new BookingModel({
      userId: data.userId,
      packageType: data.packageType,
      packageId: data.packageId,
      slotId: data.slotId,
      date: data.date,
      time: data.time,
      adults: data.adults,
      children: data.children,
      pickupLocation: data.pickupLocation,
      status: "pending",
    });

    await booking.save();

    // Update slot booked count
    await TimeSlotModel.findByIdAndUpdate(data.slotId, {
      $inc: { booked: totalRequested },
      $set: { isAvailable: slot.booked + totalRequested < slot.capacity },
    });

    return booking;
  }

  // Get bookings by user or admin with optional filters
  async getBookings(filter: any): Promise<Booking[]> {
    const query: any = {};
    
    // Copy all filter properties to query
    Object.assign(query, filter);

    // NOTE: Removed automatic markPastBookingsCompleted() call from here
    // It was causing severe performance issues by running on every page load
    // This should be handled by a scheduled cron job instead

    // Populate packageId based on packageType
    const bookings = await BookingModel.find(query)
      .sort({ createdAt: -1 })
      .exec();

    // Manually populate packageId for each booking based on packageType
    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        if (booking.packageType === 'tour') {
          return BookingModel.populate(booking, { path: 'packageId', model: 'Tour' });
        } else if (booking.packageType === 'transfer') {
          return BookingModel.populate(booking, { path: 'packageId', model: 'Transfer' });
        }
        return booking;
      })
    );

    return populatedBookings;
  }

  // Get bookings with full package details
  async getBookingsWithDetails(filter: any): Promise<any[]> {
    const query: any = {};
    
    // Copy all filter properties to query
    Object.assign(query, filter);

    // NOTE: Removed automatic markPastBookingsCompleted() call from here
    // It was causing severe performance issues by running on every page load
    // This should be handled by a scheduled cron job instead

    // Get bookings first
    const bookings = await BookingModel.find(query)
      .sort({ createdAt: -1 })
      .exec();

    // Manually populate packageId for each booking and format for frontend
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        let packageDetails = null;
        
        if (booking.packageType === 'tour') {
          const TourModel = mongoose.model('Tour');
          packageDetails = await TourModel.findById(booking.packageId).select('title image price duration slug');
        } else if (booking.packageType === 'transfer') {
          const TransferModel = mongoose.model('Transfer');
          packageDetails = await TransferModel.findById(booking.packageId).select('title image price duration vehicle slug');
        }

        return {
          _id: booking._id,
          packageType: booking.packageType,
          packageId: booking.packageId,
          date: booking.date,
          time: booking.time,
          adults: booking.adults,
          children: booking.children,
          pickupLocation: booking.pickupLocation,
          total: booking.total,
          status: booking.status,
          createdAt: booking.createdAt,
          contactInfo: booking.contactInfo,
          packageDetails: packageDetails ? {
            title: packageDetails.title,
            image: packageDetails.image,
            price: packageDetails.price,
            duration: packageDetails.duration,
            slug: packageDetails.slug,
            vehicle: packageDetails.vehicle // for transfers
          } : null
        };
      })
    );

    return bookingsWithDetails;
  }

  // Get booking by ID
  async getBookingById(id: string): Promise<Booking | null> {
    const booking = await BookingModel.findById(id).exec();
    if (!booking) return null;
    
    // Populate packageId based on packageType
    if (booking.packageType === 'tour') {
      return BookingModel.populate(booking, { path: 'packageId', model: 'Tour' });
    } else if (booking.packageType === 'transfer') {
      return BookingModel.populate(booking, { path: 'packageId', model: 'Transfer' });
    }
    return booking;
  }

  // Update booking (no cancellation support)
  async updateBooking(
    id: string,
    updateData: Partial<{
      adults: number;
      children: number;
      pickupLocation: string;
      status: "pending" | "confirmed" | "cancelled";
    }>
  ): Promise<Booking | null> {
    const booking = await BookingModel.findById(id);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // If updating adults or children, adjust slot booked count accordingly
    if (
      (updateData.adults !== undefined && updateData.adults !== booking.adults) ||
      (updateData.children !== undefined && updateData.children !== booking.children)
    ) {
      if (booking.slotId) {
        const slot = await TimeSlotModel.findById(booking.slotId);
        if (!slot) {
          throw new Error("Associated time slot not found");
        }

        const oldTotal = booking.adults + booking.children;
        const newAdults = updateData.adults !== undefined ? updateData.adults : booking.adults;
        const newChildren = updateData.children !== undefined ? updateData.children : booking.children;
        const newTotal = newAdults + newChildren;

        const diff = newTotal - oldTotal;
        if (slot.booked + diff > slot.capacity) {
          throw new Error("Not enough capacity in the time slot for update");
        }

        slot.booked += diff;
        slot.isAvailable = slot.booked < slot.capacity;
        await slot.save();
      }

      booking.adults = updateData.adults !== undefined ? updateData.adults : booking.adults;
      booking.children = updateData.children !== undefined ? updateData.children : booking.children;
    }

    if (updateData.pickupLocation !== undefined) {
      booking.pickupLocation = updateData.pickupLocation;
    }

    if (updateData.status !== undefined) {
      booking.status = updateData.status;
    }

    await booking.save();
    return booking;
  }

  // Confirm payment (mark booking as confirmed)
  async confirmPayment(id: string): Promise<Booking | null> {
    const booking = await BookingModel.findById(id);
    if (!booking) {
      throw new Error("Booking not found");
    }
    booking.status = "confirmed";
    await booking.save();
    return booking;
  }

  // Delete booking and adjust related time slot and package counts
  async deleteBooking(id: string): Promise<boolean> {
    const booking = await BookingModel.findById(id);
    if (!booking) return false;

    // If booking had a slotId or package info, adjust counts
    try {
      const packageType = booking.packageType;
      const packageId = booking.packageId as any;

      // For vehicle/private bookings treat as one vehicle when updating slots
      const persons = booking.isVehicleBooking ? 1 : (booking.adults + booking.children);

      // Format date string for TimeSlotService
      const { formatDateAsMalaysiaTimezone } = require('../utils/dateUtils');
      const slotDateStr = formatDateAsMalaysiaTimezone(booking.date);

      // Subtract booked count from time slot
      try {
        await TimeSlotService.updateSlotBooking(
          packageType as 'tour' | 'transfer',
          packageId,
          slotDateStr,
          booking.time,
          persons,
          'subtract'
        );
      } catch (slotErr) {
        console.error('Failed to update time slot when deleting booking:', slotErr);
        // proceed with deletion even if slot update fails
      }

      // Decrement package bookedCount if applicable
      try {
        const mongoose = require('mongoose');
        const PackageModel = packageType === 'tour' ? mongoose.model('Tour') : mongoose.model('Transfer');
        if (PackageModel) {
          await PackageModel.findByIdAndUpdate(packageId, { $inc: { bookedCount: -persons } });
        }
      } catch (pkgErr) {
        console.error('Failed to update package bookedCount when deleting booking:', pkgErr);
      }

      // Finally delete the booking
      await BookingModel.findByIdAndDelete(id);
      return true;
    } catch (error) {
      console.error('Error deleting booking in service:', error);
      throw error;
    }
  }
}

export default new BookingService();
