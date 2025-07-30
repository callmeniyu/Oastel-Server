import mongoose from "mongoose"
import { env } from "./env"

const connectDB = async () => {
    try {
        const options: mongoose.ConnectOptions = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4, // Use IPv4, skip trying IPv6
            connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
            retryWrites: true,
            retryReads: true,
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
