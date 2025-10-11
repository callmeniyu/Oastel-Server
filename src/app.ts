import './config/env'; // Load environment variables first
import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import webhookRoutes from "./routes/webhook.routes"
import tourRoutes from "./routes/tour.routes"
import transferRoutes from "./routes/transfer.routes"
import bookingRoutes from "./routes/booking.routes"
import blackoutDateRoutes from "./routes/blackoutDate.routes"
import blogRoutes from "./routes/blog.routes"
import uploadRoutes from "./routes/upload.routes"
import timeSlotRoutes from "./routes/timeSlot.routes"
import cartRoutes from "./routes/cart.routes"
import cartBookingRoutes from "./routes/cartBooking.routes"
import userRoutes from "./routes/user.routes"
import emailRoutes from "./routes/email.routes"
import vehicleRoutes from "./routes/vehicle.routes"
import rollingTimeslotRoutes from "./routes/rollingTimeslot.routes"
import paymentRoutes from "./routes/payment.routes"
import paymentDebugRoutes from "./routes/paymentDebug.routes"
import { PaymentCleanupService } from "./services/paymentCleanup.service"

const app = express()

app.use(cors())
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(morgan("dev"))

// Stripe webhook needs raw body for signature verification. Mount webhook route with raw middleware.
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Regular JSON body parsing for other routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/tours", tourRoutes)
app.use("/api/transfers", transferRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/blackout-dates", blackoutDateRoutes)
app.use("/api/blogs", blogRoutes)
app.use("/api/upload", uploadRoutes)
console.log("🔗 Registering timeslots routes at /api/timeslots")
app.use("/api/timeslots", timeSlotRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/cart-booking", cartBookingRoutes)
app.use("/api/users", userRoutes)
app.use("/api/email", emailRoutes)
// Vehicle management for private transfers
app.use("/api/vehicles", vehicleRoutes)
// Rolling timeslot management
app.use("/api/rolling-timeslots", rollingTimeslotRoutes)
// Payment processing
app.use("/api/payments", paymentRoutes)
// Payment debugging
app.use("/api/payment-debug", paymentDebugRoutes)

// Start automatic payment intent cleanup service
// This prevents abandoned payment intents from showing as "incomplete" in Stripe dashboard
if (process.env.NODE_ENV !== 'test') {
  // Clean up payment intents older than 15 minutes, run every 30 minutes
  PaymentCleanupService.startAutoCleanup(30, 15);
}

export default app
