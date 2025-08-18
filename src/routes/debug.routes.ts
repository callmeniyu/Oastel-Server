import { Router } from "express"
import { debugTours, testReviewEmail, testReviewScheduler, previewReviewEmail } from "../controllers/debug.controller"

const debugRouter = Router()

// GET /api/debug/tours - Get all tours with time slot counts
debugRouter.get("/tours", debugTours)

// GET /api/debug/test-review-email - Test review email functionality
debugRouter.get("/test-review-email", testReviewEmail)

// GET /api/debug/test-review-scheduler - Test review scheduler for recent bookings
debugRouter.get("/test-review-scheduler", testReviewScheduler)

// GET /api/debug/preview-review-email - Preview review email template
debugRouter.get("/preview-review-email", previewReviewEmail)

export default debugRouter
