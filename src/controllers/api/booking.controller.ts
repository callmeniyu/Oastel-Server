import { Request, Response } from 'express';
import Booking from '../../models/Booking';
import TimeSlot from '../../models/TimeSlot';
import { Types } from 'mongoose';
import { TimeSlotService } from '../../services/timeSlot.service';

export async function createBooking(req: Request, res: Response) {
  try {
    const {
      userId,
      packageType,
      packageId,
      date,
      time,
      adults,
      children,
      pickupLocation,
      contactInfo,
      subtotal,
      paymentInfo,
      isAdminBooking
    } = req.body;

    // Find or create time slot
    let timeSlot = await TimeSlot.findOne({
      packageId: new Types.ObjectId(packageId),
      packageType,
      date
    });

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Check slot availability
    const slot = timeSlot.slots.find(s => s.time === time);
    if (!slot || !slot.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time is not available'
      });
    }

    // Check capacity
    const totalGuests = adults + children;
    if (slot.bookedCount + totalGuests > slot.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough capacity for selected guests'
      });
    }

    // Check minimum person rule for first booking
    const isFirstBooking = slot.bookedCount === 0;
    const requiredMinimum = slot.minimumPerson || 1;
    
    if (isFirstBooking && totalGuests < requiredMinimum) {
      return res.status(400).json({
        success: false,
        message: `This is the first booking for this time slot. Minimum ${requiredMinimum} person${requiredMinimum > 1 ? 's' : ''} required.`
      });
    }

    let bookingPaymentInfo;
    let total;

    if (isAdminBooking && paymentInfo) {
      // For admin bookings, use the provided payment info (no bank charges)
      bookingPaymentInfo = paymentInfo;
      total = paymentInfo.amount;
    } else {
      // For regular customer bookings, calculate bank charge (2.8%)
      const bankCharge = subtotal * 0.028;
      total = subtotal + bankCharge;
      bookingPaymentInfo = {
        amount: total,
        bankCharge,
        currency: 'MYR',
        paymentStatus: 'pending'
      };
    }

    // Create booking
    const booking = new Booking({
      userId,
      packageType,
      packageId,
      slotId: timeSlot._id,
      date,
      time,
      adults,
      children,
      pickupLocation,
      contactInfo,
      subtotal,
      total,
      paymentInfo: bookingPaymentInfo,
      ...(isAdminBooking && { isAdminBooking: true })
    });

    // Update slot booking count
    slot.bookedCount += totalGuests;
    if (slot.bookedCount >= slot.capacity) {
      slot.isAvailable = false;
    }
    timeSlot.booked += totalGuests;
    if (timeSlot.booked >= timeSlot.capacity) {
      timeSlot.isAvailable = false;
    }

    await Promise.all([booking.save(), timeSlot.save()]);

    // Update slot with proper minimum person logic using TimeSlotService
    try {
      await TimeSlotService.updateSlotBooking(
        packageType,
        new Types.ObjectId(packageId),
        date,
        time,
        totalGuests,
        'add'
      );
    } catch (updateError) {
      console.warn('Warning: TimeSlotService update failed:', updateError);
      // Don't fail the booking if slot service update fails
    }

    return res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function getBookingsByDate(req: Request, res: Response) {
  try {
    const { date, packageType } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const query: any = {
      date: new Date(date as string)
    };

    if (packageType) {
      query.packageType = packageType;
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email')
      .populate({
        path: 'packageId',
        select: 'title image price type duration'
      })
      .sort({ createdAt: -1 });

    // Group bookings by time slot
    const bookingsBySlot = bookings.reduce((acc: any, booking) => {
      const time = booking.time;
      if (!acc[time]) {
        acc[time] = {
          time,
          bookings: [],
          totalGuests: 0
        };
      }
      acc[time].bookings.push(booking);
      acc[time].totalGuests += (booking.adults + booking.children);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: Object.values(bookingsBySlot)
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function getAvailableSlots(req: Request, res: Response) {
  try {
    const { packageId, packageType, date } = req.query;

    if (!packageId || !packageType || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const timeSlot = await TimeSlot.findOne({
      packageId: new Types.ObjectId(packageId as string),
      packageType,
      date,
      isAvailable: true
    });

    if (!timeSlot) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Filter out unavailable slots and past cutoff times
    const now = new Date();
    const availableSlots = timeSlot.slots.filter(slot => {
      if (!slot.isAvailable) return false;
      if (slot.cutoffTime && now > slot.cutoffTime) return false;
      return true;
    });

    return res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function updateBookingStatus(req: Request, res: Response) {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    await booking.save();

    return res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
