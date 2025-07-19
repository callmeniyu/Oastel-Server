import express from "express"
import cors from "cors"
import helmet from "helmet"
import { env } from "./config/env"
import userRoutes from "./routes/user.routes"
import tourRoutes from "./routes/tour.routes"
import transferRoutes from "./routes/transfer.routes"
import uploadRoutes from "./routes/upload.routes"
import blogRoutes from "./routes/blog.routes"
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

// Routes
app.use("/api/users", userRoutes)
app.use("/api/tours", tourRoutes)
app.use("/api/transfers", transferRoutes)
app.use("/api/blogs", blogRoutes)
app.use("/api/upload", uploadRoutes)

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK" })
})

// Connect to DB
connectDB()

export default app
