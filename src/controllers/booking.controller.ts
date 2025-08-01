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
        paymentInfo
      } = req.body;

      // Validate required fields
      if (!packageType || !packageId || !date || !time || !adults || adults < 1 || !contactInfo) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required fields" 
        });
      }

      // Create booking directly without userId for now
      const booking = await BookingService.createBookingDirect({
        packageType,
        packageId: new mongoose.Types.ObjectId(packageId),
        date: new Date(date),
        time,
        adults,
        children: children || 0,
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
        await EmailService.sendBookingConfirmation({
          customerName: contactInfo.name,
          customerEmail: contactInfo.email,
          bookingId: (booking as any)._id.toString(),
          packageName: packageType === 'tour' ? 'Tour Package' : 'Transfer Service',
          packageType,
          date: new Date(date).toLocaleDateString(),
          time,
          adults,
          children: children || 0,
          pickupLocation,
          total,
          currency: paymentInfo?.currency || "MYR"
        });
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
        const startDate = new Date(dateStr);
        const endDate = new Date(dateStr);
        endDate.setDate(endDate.getDate() + 1);
        filter.date = {
          $gte: startDate,
          $lt: endDate
        };
      }

      // Handle beforeDate filtering (for booking history)
      if (req.query.beforeDate) {
        const beforeDateStr = req.query.beforeDate as string;
        const beforeDate = new Date(beforeDateStr);
        filter.date = {
          $lt: beforeDate
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
}

export default new BookingController();
