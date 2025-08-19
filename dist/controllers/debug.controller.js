"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testReviewScheduler = exports.previewReviewEmail = exports.testReviewEmail = exports.debugTours = void 0;
const email_service_1 = __importDefault(require("../services/email.service"));
const reviewScheduler_service_1 = __importDefault(require("../services/reviewScheduler.service"));
/**
 * Debug: Get all tours with their time slot counts
 */
const debugTours = async (req, res) => {
    try {
        // Import models
        const Tour = (await Promise.resolve().then(() => __importStar(require("../models/Tour")))).default;
        const TimeSlot = (await Promise.resolve().then(() => __importStar(require("../models/TimeSlot")))).default;
        // Get all tours
        const tours = await Tour.find({});
        // Get time slot counts for each tour
        const tourDebugData = await Promise.all(tours.map(async (tour) => {
            const timeSlotCount = await TimeSlot.countDocuments({
                packageId: tour._id
            });
            const latestSlot = await TimeSlot.findOne({
                packageId: tour._id
            }).sort({ date: -1 });
            const earliestSlot = await TimeSlot.findOne({
                packageId: tour._id
            }).sort({ date: 1 });
            return {
                _id: tour._id,
                title: tour.title,
                slug: tour.slug,
                departureTimes: tour.departureTimes || [],
                timeSlotCount,
                dateRange: timeSlotCount > 0 ? {
                    earliest: earliestSlot?.date,
                    latest: latestSlot?.date
                } : null,
                hasTimeSlots: timeSlotCount > 0
            };
        }));
        const summary = {
            totalTours: tours.length,
            toursWithTimeSlots: tourDebugData.filter(t => t.hasTimeSlots).length,
            toursWithoutTimeSlots: tourDebugData.filter(t => !t.hasTimeSlots).length,
            totalTimeSlots: tourDebugData.reduce((sum, t) => sum + t.timeSlotCount, 0)
        };
        res.json({
            success: true,
            data: {
                summary,
                tours: tourDebugData
            }
        });
    }
    catch (error) {
        console.error("Error getting debug tours:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.debugTours = debugTours;
/**
 * Debug: Test review email functionality
 */
const testReviewEmail = async (req, res) => {
    try {
        console.log('🧪 Testing review email functionality...');
        // Test email data
        const testReviewData = {
            customerName: 'John Doe',
            customerEmail: 'test@example.com', // Replace with your email for testing
            bookingId: 'TEST123456',
            packageName: 'Kuala Lumpur City Tour',
            packageType: 'tour',
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            reviewFormUrl: process.env.GOOGLE_FORM_URL || 'https://forms.gle/your-review-form-id'
        };
        // Send test review email
        const emailSent = await email_service_1.default.sendReviewRequest(testReviewData);
        if (emailSent) {
            res.json({
                success: true,
                message: 'Test review email sent successfully!',
                data: {
                    recipient: testReviewData.customerEmail,
                    bookingId: testReviewData.bookingId,
                    reviewFormUrl: testReviewData.reviewFormUrl
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test review email'
            });
        }
    }
    catch (error) {
        console.error("Error testing review email:", error);
        res.status(500).json({
            success: false,
            message: "Error testing review email",
            error: error.message
        });
    }
};
exports.testReviewEmail = testReviewEmail;
/**
 * Debug: Preview review email template
 */
const previewReviewEmail = async (req, res) => {
    try {
        // Test email data
        const testReviewData = {
            customerName: 'John Doe',
            customerEmail: 'test@example.com',
            bookingId: 'TEST123456',
            packageName: 'Kuala Lumpur City Tour',
            packageType: 'tour',
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            reviewFormUrl: process.env.GOOGLE_FORM_URL || 'https://forms.gle/your-review-form-id'
        };
        // Generate HTML using the private method (we'll need to make it public or access it differently)
        const emailServiceInstance = email_service_1.default;
        const html = emailServiceInstance.generateReviewRequestHTML(testReviewData);
        // Return HTML for preview
        res.set('Content-Type', 'text/html');
        res.send(html);
    }
    catch (error) {
        console.error("Error previewing review email:", error);
        res.status(500).json({
            success: false,
            message: "Error previewing review email",
            error: error.message
        });
    }
};
exports.previewReviewEmail = previewReviewEmail;
/**
 * Debug: Test review scheduler for recent bookings
 */
const testReviewScheduler = async (req, res) => {
    try {
        console.log('🧪 Testing review scheduler...');
        await reviewScheduler_service_1.default.testReviewEmails();
        res.json({
            success: true,
            message: 'Review scheduler test completed! Check console logs for details.'
        });
    }
    catch (error) {
        console.error("Error testing review scheduler:", error);
        res.status(500).json({
            success: false,
            message: "Error testing review scheduler",
            error: error.message
        });
    }
};
exports.testReviewScheduler = testReviewScheduler;
