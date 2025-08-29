import BookingModel, { Booking } from "../models/Booking";
import TimeSlotModel from "../models/TimeSlot";
import { TimeSlotService } from "./timeSlot.service";
import mongoose from "mongoose";

class BookingService {
  // Mark confirmed bookings as completed if their date/time is in the past
  private async markPastBookingsCompleted(additionalFilter: any = {}) {
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

  const totalGuests = data.adults + data.children;
      
      // Check slot availability using TimeSlotService (includes minimum person validation)
      // For vehicle bookings, requestedPersons should be treated as 1 (one vehicle)
      const requestedPersons = data.isVehicleBooking ? 1 : totalGuests;
      // Ensure we use Malaysia-local date string for slot lookups (avoid UTC shift)
      const slotDateStr = TimeSlotService.formatDateToMalaysiaTimezone(
        data.date.toISOString().split('T')[0]
      );

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

      // Create booking without userId and slotId (for guest bookings using dynamic slots)
      const booking = new BookingModel({
        userId: null, // Guest booking
        packageType: data.packageType,
        packageId: data.packageId,
        slotId: null, // No specific slot for guest bookings using dynamic slots
        date: data.date,
        time: data.time,
        adults: data.adults,
        children: data.children,
        pickupLocation: data.pickupLocation,
        status: "pending",
        contactInfo: data.contactInfo,
        paymentInfo: data.paymentInfo,
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

  // Ensure past confirmed bookings are updated to completed before returning lists
  await this.markPastBookingsCompleted(filter);

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

  // Ensure past confirmed bookings are updated to completed before returning lists
  await this.markPastBookingsCompleted(filter);

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
      const slotDateStr = TimeSlotService.formatDateToMalaysiaTimezone(
        booking.date.toISOString().split('T')[0]
      );

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
