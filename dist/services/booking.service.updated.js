"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Booking_1 = __importDefault(require("../models/Booking"));
const TimeSlot_1 = __importDefault(require("../models/TimeSlot"));
const BlackoutDate_1 = __importDefault(require("../models/BlackoutDate"));
class BookingService {
    // Create a new booking
    async createBooking(data) {
        // Check if date is a blackout date for the package type
        const blackout = await BlackoutDate_1.default.findOne({
            date: data.date,
            packageType: data.packageType,
        });
        if (blackout) {
            throw new Error("Selected date is a blackout date and not available for booking");
        }
        // Validate slot availability
        const timeSlot = await TimeSlot_1.default.findById(data.slotId);
        if (!timeSlot) {
            throw new Error("Time slot not found");
        }
        // Find the specific slot by time
        const slot = timeSlot.slots.find(s => s.time === data.time);
        if (!slot) {
            throw new Error("Requested time not found in time slots");
        }
        const totalRequested = data.adults + data.children;
        if (slot.bookedCount + totalRequested > slot.capacity) {
            throw new Error("Not enough capacity in the selected time slot");
        }
        // Create booking with status pending
        const booking = new Booking_1.default({
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
        slot.bookedCount += totalRequested;
        await timeSlot.save();
        return booking;
    }
    // Get bookings by user or admin with optional filters
    async getBookings(filter) {
        const query = {};
        if (filter.userId)
            query.userId = filter.userId;
        if (filter.packageType)
            query.packageType = filter.packageType;
        if (filter.status)
            query.status = filter.status;
        return Booking_1.default.find(query).sort({ createdAt: -1 }).exec();
    }
    // Get booking by ID
    async getBookingById(id) {
        return Booking_1.default.findById(id).exec();
    }
    // Update booking (no cancellation support)
    async updateBooking(id, updateData) {
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            throw new Error("Booking not found");
        }
        // If updating adults or children, adjust slot booked count accordingly
        if ((updateData.adults !== undefined && updateData.adults !== booking.adults) ||
            (updateData.children !== undefined && updateData.children !== booking.children)) {
            const timeSlot = await TimeSlot_1.default.findById(booking.slotId);
            if (!timeSlot) {
                throw new Error("Associated time slot not found");
            }
            const slot = timeSlot.slots.find(s => s.time === booking.time);
            if (!slot) {
                throw new Error("Associated time slot entry not found");
            }
            const oldTotal = booking.adults + booking.children;
            const newAdults = updateData.adults !== undefined ? updateData.adults : booking.adults;
            const newChildren = updateData.children !== undefined ? updateData.children : booking.children;
            const newTotal = newAdults + newChildren;
            const diff = newTotal - oldTotal;
            if (slot.bookedCount + diff > slot.capacity) {
                throw new Error("Not enough capacity in the time slot for update");
            }
            slot.bookedCount += diff;
            await timeSlot.save();
            booking.adults = newAdults;
            booking.children = newChildren;
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
    async confirmPayment(id) {
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            throw new Error("Booking not found");
        }
        booking.status = "confirmed";
        await booking.save();
        return booking;
    }
}
exports.default = new BookingService();
