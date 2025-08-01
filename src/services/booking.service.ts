import BookingModel, { Booking } from "../models/Booking";
import TimeSlotModel from "../models/TimeSlot";
import { TimeSlotService } from "./timeSlot.service";
import mongoose from "mongoose";

class BookingService {
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
      const availability = await TimeSlotService.checkAvailability(
        data.packageType,
        data.packageId,
        data.date.toISOString().split('T')[0],
        data.time,
        totalGuests
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
        firstBookingMinimum: false // Can be calculated based on business logic
      });

      const savedBooking = await booking.save();

      // Update slot booking count using TimeSlotService
      await TimeSlotService.updateSlotBooking(
        data.packageType,
        data.packageId,
        data.date.toISOString().split('T')[0],
        data.time,
        totalGuests,
        "add"
      );

      // Update package bookedCount
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
}

export default new BookingService();
