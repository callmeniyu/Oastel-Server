import './config/env'; // Load environment variables first
import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
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

const app = express()

app.use(cors())
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(morgan("dev"))
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


export default app
