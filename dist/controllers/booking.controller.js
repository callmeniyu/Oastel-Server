"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const booking_service_1 = __importDefault(require("../services/booking.service"));
const email_service_1 = __importDefault(require("../services/email.service"));
const mongoose_1 = __importDefault(require("mongoose"));
class BookingController {
    // Create a new booking
    async createBooking(req, res) {
        try {
            const { packageType, packageId, date, time, adults, children, pickupLocation, contactInfo, subtotal, total, paymentInfo } = req.body;
            // Validate required fields
            if (!packageType || !packageId || !date || !time || !adults || adults < 1 || !contactInfo) {
                return res.status(400).json({
                    success: false,
                    error: "Missing required fields"
                });
            }
            // Create booking directly without userId for now
            const booking = await booking_service_1.default.createBookingDirect({
                packageType,
                packageId: new mongoose_1.default.Types.ObjectId(packageId),
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
            // Get package details for email
            let packageDetails = null;
            if (packageType === 'tour') {
                const mongoose = require('mongoose');
                const TourModel = mongoose.model('Tour');
                packageDetails = await TourModel.findById(packageId);
            }
            else if (packageType === 'transfer') {
                const mongoose = require('mongoose');
                const TransferModel = mongoose.model('Transfer');
                packageDetails = await TransferModel.findById(packageId);
            }
            // Send confirmation email to customer
            try {
                const emailData = {
                    customerName: contactInfo.name,
                    customerEmail: contactInfo.email,
                    bookingId: booking._id.toString(),
                    packageId: packageId,
                    packageName: packageDetails?.title || (packageType === 'tour' ? 'Tour Package' : 'Transfer Service'),
                    packageType,
                    // Send ISO date string so server email formatter can reliably parse it
                    date: booking.date ? booking.date.toISOString() : new Date(date).toISOString(),
                    time,
                    adults,
                    children: children || 0,
                    pickupLocation,
                    total,
                    currency: paymentInfo?.currency || "MYR"
                };
                // Add transfer-specific details
                if (packageType === 'transfer' && packageDetails) {
                    emailData.from = packageDetails.from;
                    emailData.to = packageDetails.to;
                }
                await email_service_1.default.sendBookingConfirmation(emailData);
                console.log(`Confirmation email sent to ${contactInfo.email}`);
            }
            catch (emailError) {
                console.error("Failed to send confirmation email:", emailError.message);
                // Don't fail the booking creation if email fails
            }
            res.status(201).json({
                success: true,
                data: booking
            });
        }
        catch (error) {
            console.error("Error creating booking:", error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    // Get bookings list
    async getBookings(req, res) {
        try {
            const filter = {};
            // Handle userId filtering - if provided, search by contactInfo.email
            if (req.query.userId) {
                filter['contactInfo.email'] = req.query.userId;
            }
            if (req.query.packageType)
                filter.packageType = req.query.packageType;
            if (req.query.status)
                filter.status = req.query.status;
            if (req.query.packageId)
                filter.packageId = new mongoose_1.default.Types.ObjectId(req.query.packageId);
            if (req.query.time)
                filter.time = req.query.time;
            // Handle date filtering
            if (req.query.date) {
                const dateStr = req.query.date;
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
                const beforeDateStr = req.query.beforeDate;
                const beforeDate = new Date(beforeDateStr);
                filter.date = {
                    $lt: beforeDate
                };
            }
            const bookings = await booking_service_1.default.getBookings(filter);
            res.json({
                success: true,
                bookings: bookings
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    // Get bookings by user email
    async getBookingsByUser(req, res) {
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
            const bookings = await booking_service_1.default.getBookingsWithDetails(filter);
            res.json({
                success: true,
                data: bookings
            });
        }
        catch (error) {
            console.error("Error fetching user bookings:", error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    // Get booking by ID
    async getBookingById(req, res) {
        try {
            const booking = await booking_service_1.default.getBookingById(req.params.id);
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
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    // Update booking
    async updateBooking(req, res) {
        try {
            const updateData = req.body;
            const booking = await booking_service_1.default.updateBooking(req.params.id, updateData);
            if (!booking) {
                return res.status(404).json({ error: "Booking not found" });
            }
            res.json(booking);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    // Confirm payment (simulate)
    async confirmPayment(req, res) {
        try {
            const booking = await booking_service_1.default.confirmPayment(req.params.id);
            if (!booking) {
                return res.status(404).json({ error: "Booking not found" });
            }
            res.json(booking);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
exports.default = new BookingController();
