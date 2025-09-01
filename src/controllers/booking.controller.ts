import { Request, Response } from "express";
import BookingService from "../services/booking.service";
import EmailService from "../services/email.service";
import mongoose from "mongoose";

class BookingController {
  // Create a new booking
  async createBooking(req: Request, res: Response) {
    try {
      const {
        packageType,
        packageId,
        date,
        time,
        adults,
        children,
        pickupLocation,
        contactInfo,
        subtotal,
        total,
        paymentInfo,
        isVehicleBooking
      } = req.body;

      // Validate required fields
      // For vehicle bookings (private transfers) adults may be 0 because booking is per-vehicle
      const adultsCount = typeof adults === 'number' ? adults : 0;
      if (!packageType || !packageId || !date || !time || !contactInfo) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required fields" 
        });
      }
      if (!isVehicleBooking && adultsCount < 1) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields"
        });
      }

      // Create booking directly without userId for now
      // Parse date as local midnight to avoid timezone offset issues (treat incoming YYYY-MM-DD as local date)
      // Parse incoming YYYY-MM-DD as UTC midday to avoid timezone shift when
      // converting to ISO date strings later (prevents off-by-one day issues)
      const parsedDateForBooking = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(date + 'T12:00:00.000Z')
        : new Date(date);

      // Get package details for checking vehicle capacity
      let packageDetails: any = null;
      if (packageType === 'tour') {
        const mongoose = require('mongoose');
        const TourModel = mongoose.model('Tour');
        packageDetails = await TourModel.findById(packageId);
      } else if (packageType === 'transfer') {
        const mongoose = require('mongoose');
        const TransferModel = mongoose.model('Transfer');
        packageDetails = await TransferModel.findById(packageId);
      }

      const booking = await BookingService.createBookingDirect({
        packageType,
        packageId: new mongoose.Types.ObjectId(packageId),
        date: parsedDateForBooking,
        time,
        adults: adultsCount,
        children: children || 0,
        isVehicleBooking: !!isVehicleBooking,
        vehicleSeatCapacity: isVehicleBooking && packageDetails ? packageDetails.seatCapacity : undefined,
        pickupLocation,
        contactInfo,
        subtotal: subtotal || total,
        total,
        paymentInfo: paymentInfo || {
          amount: total,
          bankCharge: 0,
          currency: "MYR",
          paymentStatus: "pending"
        }
      });

      // Send confirmation email to customer
      try {
        const emailData = {
          customerName: contactInfo.name,
          customerEmail: contactInfo.email,
          bookingId: (booking as any)._id.toString(),
          packageId: packageId,
          packageName: packageDetails?.title || (packageType === 'tour' ? 'Tour Package' : 'Transfer Service'),
          packageType,
          // Send ISO date string so server email formatter can reliably parse it
          date: (booking as any).date ? (booking as any).date.toISOString() : new Date(date).toISOString(),
          time,
          adults,
          children: children || 0,
          pickupLocation,
          total,
          currency: paymentInfo?.currency || "MYR"
        };

        // Add transfer-specific details
        if (packageType === 'transfer' && packageDetails) {
          (emailData as any).from = packageDetails.from;
          (emailData as any).to = packageDetails.to;
          
          // Add vehicle information for private transfers
          if (packageDetails.type === 'Private') {
            (emailData as any).isVehicleBooking = true;
            (emailData as any).vehicleName = packageDetails.vehicle;
            (emailData as any).vehicleSeatCapacity = packageDetails.seatCapacity;
          }
        }

        // Add pickup guidelines from package details (handle both new and legacy field names)
        if (packageDetails?.details?.pickupGuidelines) {
          (emailData as any).pickupGuidelines = packageDetails.details.pickupGuidelines;
        } else if (packageType === 'transfer' && (packageDetails?.details as any)?.pickupDescription) {
          // Fallback for legacy transfers that use pickupDescription
          (emailData as any).pickupGuidelines = (packageDetails.details as any).pickupDescription;
        }

        await EmailService.sendBookingConfirmation(emailData);
        console.log(`Confirmation email sent to ${contactInfo.email}`);
      } catch (emailError: any) {
        console.error("Failed to send confirmation email:", emailError.message);
        // Don't fail the booking creation if email fails
      }

      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Get bookings list
  async getBookings(req: Request, res: Response) {
    try {
      const filter: any = {};
      
      // Handle userId filtering - if provided, search by contactInfo.email
      if (req.query.userId) {
        filter['contactInfo.email'] = req.query.userId as string;
      }
      
      if (req.query.packageType) filter.packageType = req.query.packageType as "tour" | "transfer";
      if (req.query.status) filter.status = req.query.status as "pending" | "confirmed" | "cancelled";
      if (req.query.packageId) filter.packageId = new mongoose.Types.ObjectId(req.query.packageId as string);
      if (req.query.time) filter.time = req.query.time as string;
      
      // Handle date filtering
      if (req.query.date) {
        const dateStr = req.query.date as string;
        // Treat incoming date string as local date (YYYY-MM-DD) at midnight
        const startDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
          ? new Date(dateStr + 'T00:00:00')
          : new Date(dateStr);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        filter.date = {
          $gte: startDate,
          $lt: endDate,
        };
      }

      // Handle beforeDate filtering (for booking history)
      if (req.query.beforeDate) {
        const beforeDateStr = req.query.beforeDate as string;
        const beforeDate = /^\d{4}-\d{2}-\d{2}$/.test(beforeDateStr)
          ? new Date(beforeDateStr + 'T00:00:00')
          : new Date(beforeDateStr);
        filter.date = {
          $lt: beforeDate,
        };
      }

      const bookings = await BookingService.getBookings(filter);
      res.json({
        success: true,
        bookings: bookings
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get bookings by user email
  async getBookingsByUser(req: Request, res: Response) {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email parameter is required"
        });
      }

      const filter = {
        'contactInfo.email': email
      };

      const bookings = await BookingService.getBookingsWithDetails(filter);
      
      res.json({
        success: true,
        data: bookings
      });
    } catch (error: any) {
      console.error("Error fetching user bookings:", error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Get booking by ID
  async getBookingById(req: Request, res: Response) {
    try {
      const booking = await BookingService.getBookingById(req.params.id);
      if (!booking) {
        return res.status(404).json({ 
          success: false,
          error: "Booking not found" 
        });
      }
      res.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Update booking
  async updateBooking(req: Request, res: Response) {
    try {
      const updateData = req.body;
      const booking = await BookingService.updateBooking(req.params.id, updateData);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Confirm payment (simulate)
  async confirmPayment(req: Request, res: Response) {
    try {
      const booking = await BookingService.confirmPayment(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Delete booking
  async deleteBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Booking ID is required' });
      }

      const result = await BookingService.deleteBooking(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }
}

export default new BookingController();
