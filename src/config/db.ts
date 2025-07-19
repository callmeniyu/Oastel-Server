import mongoose from "mongoose"
import { env } from "./env"

const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
        }

        await mongoose.connect(env.MONGO_URI, options)
        console.log("MongoDB Connected with optimized settings")
    } catch (error) {
        console.error("MongoDB Connection Error:", error)
        process.exit(1)
    }
}

mongoose.connection.on("error", (err) => {
    console.error("MongoDB Error:", err)
})

// Handle connection events
mongoose.connection.on("connected", () => {
    console.log("MongoDB connected to database")
})

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected")
})

export default connectDB
