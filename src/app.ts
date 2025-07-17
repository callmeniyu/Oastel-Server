import express from "express"
import cors from "cors"
import helmet from "helmet"
import path from "path"
import { env } from "./config/env"
import userRoutes from "./routes/user.routes"
import tourRoutes from "./routes/tour.routes"
import uploadRoutes from "./routes/upload.routes"
import connectDB from "./config/db"

const app = express()

// Middleware
app.use(helmet())
app.use(
    cors({
        origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    })
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Routes
app.use("/api/users", userRoutes)
app.use("/api/tours", tourRoutes)
app.use("/api/upload", uploadRoutes)

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK" })
})

// Connect to DB
connectDB()

export default app
