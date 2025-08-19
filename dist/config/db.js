"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4, // Use IPv4, skip trying IPv6
            connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
            retryWrites: true,
            retryReads: true,
            bufferCommands: false, // Disable mongoose buffering
        };
        await mongoose_1.default.connect(env_1.env.MONGO_URI, options);
        console.log("MongoDB Connected with optimized settings");
    }
    catch (error) {
        console.error("MongoDB Connection Error:", error);
        process.exit(1);
    }
};
mongoose_1.default.connection.on("error", (err) => {
    console.error("MongoDB Error:", err);
});
// Handle connection events
mongoose_1.default.connection.on("connected", () => {
    console.log("MongoDB connected to database");
});
mongoose_1.default.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
});
exports.default = connectDB;
