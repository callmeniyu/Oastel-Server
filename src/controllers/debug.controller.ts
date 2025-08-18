import { Request, Response } from "express"
import { Types } from "mongoose"
import emailService from "../services/email.service"
import reviewScheduler from "../services/reviewScheduler.service"

/**
 * Debug: Get all tours with their time slot counts
 */
export const debugTours = async (req: Request, res: Response) => {
    try {
        // Import models
        const Tour = (await import("../models/Tour")).default
        const TimeSlot = (await import("../models/TimeSlot")).default

        // Get all tours
        const tours = await Tour.find({})

        // Get time slot counts for each tour
        const tourDebugData = await Promise.all(
            tours.map(async (tour) => {
                const timeSlotCount = await TimeSlot.countDocuments({
                    packageId: tour._id
                })

                const latestSlot = await TimeSlot.findOne({
                    packageId: tour._id
                }).sort({ date: -1 })

                const earliestSlot = await TimeSlot.findOne({
                    packageId: tour._id
                }).sort({ date: 1 })

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
                }
            })
        )

        const summary = {
            totalTours: tours.length,
            toursWithTimeSlots: tourDebugData.filter(t => t.hasTimeSlots).length,
            toursWithoutTimeSlots: tourDebugData.filter(t => !t.hasTimeSlots).length,
            totalTimeSlots: tourDebugData.reduce((sum, t) => sum + t.timeSlotCount, 0)
        }

        res.json({
            success: true,
            data: {
                summary,
                tours: tourDebugData
            }
        })
    } catch (error: any) {
        console.error("Error getting debug tours:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

/**
 * Debug: Test review email functionality
 */
export const testReviewEmail = async (req: Request, res: Response) => {
    try {
        console.log('🧪 Testing review email functionality...');

        // Test email data
        const testReviewData = {
            customerName: 'John Doe',
            customerEmail: 'test@example.com', // Replace with your email for testing
            bookingId: 'TEST123456',
            packageName: 'Kuala Lumpur City Tour',
            packageType: 'tour' as const,
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            reviewFormUrl: process.env.GOOGLE_FORM_URL || 'https://forms.gle/your-review-form-id'
        };

        // Send test review email
        const emailSent = await emailService.sendReviewRequest(testReviewData);

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
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test review email'
            });
        }
    } catch (error: any) {
        console.error("Error testing review email:", error);
        res.status(500).json({
            success: false,
            message: "Error testing review email",
            error: error.message
        });
    }
}

/**
 * Debug: Preview review email template
 */
export const previewReviewEmail = async (req: Request, res: Response) => {
    try {
        // Test email data
        const testReviewData = {
            customerName: 'John Doe',
            customerEmail: 'test@example.com',
            bookingId: 'TEST123456',
            packageName: 'Kuala Lumpur City Tour',
            packageType: 'tour' as const,
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            reviewFormUrl: process.env.GOOGLE_FORM_URL || 'https://forms.gle/your-review-form-id'
        };

        // Generate HTML using the private method (we'll need to make it public or access it differently)
        const emailServiceInstance = emailService as any;
        const html = emailServiceInstance.generateReviewRequestHTML(testReviewData);

        // Return HTML for preview
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (error: any) {
        console.error("Error previewing review email:", error);
        res.status(500).json({
            success: false,
            message: "Error previewing review email",
            error: error.message
        });
    }
}

/**
 * Debug: Test review scheduler for recent bookings
 */
export const testReviewScheduler = async (req: Request, res: Response) => {
    try {
        console.log('🧪 Testing review scheduler...');
        
        await reviewScheduler.testReviewEmails();
        
        res.json({
            success: true,
            message: 'Review scheduler test completed! Check console logs for details.'
        });
    } catch (error: any) {
        console.error("Error testing review scheduler:", error);
        res.status(500).json({
            success: false,
            message: "Error testing review scheduler",
            error: error.message
        });
    }
}
