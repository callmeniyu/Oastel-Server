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
exports.getServerDateTime = exports.debugTimeSlots = exports.deleteSlotsForPackage = exports.getSlotsSummary = exports.updateSlotsForPackage = exports.updateSlotBooking = exports.toggleSlotAvailability = exports.getAvailableSlots = exports.checkAvailability = exports.generateSlots = void 0;
const timeSlot_service_1 = require("../services/timeSlot.service");
const mongoose_1 = require("mongoose");
const Tour_1 = __importDefault(require("../models/Tour"));
const Transfer_1 = __importDefault(require("../models/Transfer"));
/**
 * Generate time slots for a package
 */
const generateSlots = async (req, res) => {
    try {
        const { packageType, packageId, departureTimes, capacity } = req.body;
        console.log("Generate slots request:", { packageType, packageId, departureTimes, capacity });
        if (!packageType || !packageId || !departureTimes || !capacity) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: packageType, packageId, departureTimes, capacity"
            });
        }
        if (!["tour", "transfer"].includes(packageType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid packageType. Must be 'tour' or 'transfer'"
            });
        }
        if (!Array.isArray(departureTimes) || departureTimes.length === 0) {
            return res.status(400).json({
                success: false,
                message: "departureTimes must be a non-empty array"
            });
        }
        // Validate packageId is a valid ObjectId string
        if (typeof packageId !== 'string' || packageId.length !== 24) {
            return res.status(400).json({
                success: false,
                message: "packageId must be a valid 24-character ObjectId string"
            });
        }
        // Get package details to retrieve minimumPerson
        let packageDetails;
        if (packageType === "tour") {
            packageDetails = await Tour_1.default.findById(packageId);
        }
        else {
            packageDetails = await Transfer_1.default.findById(packageId);
        }
        if (!packageDetails) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }
        // ROBUST: Don't pass minimumPerson parameter - let service fetch it
        console.log(`🎯 GENERATING SLOTS: ${packageType} ${packageId}`);
        console.log(`   Package minimumPerson: ${packageDetails.minimumPerson}`);
        console.log(`   Package type: ${packageDetails.type}`);
        await timeSlot_service_1.TimeSlotService.generateSlotsForPackage(packageType, new mongoose_1.Types.ObjectId(packageId), departureTimes, capacity
        // No minimumPerson parameter - service will fetch from package
        );
        res.status(201).json({
            success: true,
            message: "Time slots generated successfully"
        });
    }
    catch (error) {
        console.error("Error generating slots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.generateSlots = generateSlots;
/**
 * Check availability for a specific slot
 */
const checkAvailability = async (req, res) => {
    try {
        const { packageType, packageId, date, time, persons } = req.query;
        if (!packageType || !packageId || !date || !time || !persons) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: packageType, packageId, date, time, persons"
            });
        }
        const availability = await timeSlot_service_1.TimeSlotService.checkAvailability(packageType, new mongoose_1.Types.ObjectId(packageId), date, time, parseInt(persons));
        res.json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error("Error checking availability:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.checkAvailability = checkAvailability;
/**
 * Check availability for cart items (no time restrictions)
 */
/**
 * Get available slots for a specific date
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { packageType, packageId, date } = req.query;
        console.log("Get available slots request:", { packageType, packageId, date });
        if (!packageType || !packageId || !date) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: packageType, packageId, date"
            });
        }
        // Validate packageId is a valid ObjectId string
        if (typeof packageId !== 'string' || packageId.length !== 24) {
            return res.status(400).json({
                success: false,
                message: "packageId must be a valid 24-character ObjectId string"
            });
        }
        const slots = await timeSlot_service_1.TimeSlotService.getAvailableSlots(packageType, new mongoose_1.Types.ObjectId(packageId), date);
        if (!slots) {
            return res.status(404).json({
                success: false,
                message: "No slots found for the specified date"
            });
        }
        res.json({
            success: true,
            data: slots
        });
    }
    catch (error) {
        console.error("Error getting available slots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.getAvailableSlots = getAvailableSlots;
/**
 * Toggle slot availability for a specific slot
 */
const toggleSlotAvailability = async (req, res) => {
    try {
        const { packageType, packageId, date, time, isAvailable } = req.body;
        console.log("Toggle slot availability request:", { packageType, packageId, date, time, isAvailable });
        if (!packageType || !packageId || !date || !time || typeof isAvailable !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: packageType, packageId, date, time, isAvailable"
            });
        }
        if (!["tour", "transfer"].includes(packageType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid packageType. Must be 'tour' or 'transfer'"
            });
        }
        // Validate packageId is a valid ObjectId string
        if (typeof packageId !== 'string' || packageId.length !== 24) {
            return res.status(400).json({
                success: false,
                message: "packageId must be a valid 24-character ObjectId string"
            });
        }
        const result = await timeSlot_service_1.TimeSlotService.toggleSlotAvailability(packageType, new mongoose_1.Types.ObjectId(packageId), date, time, isAvailable);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Slot not found for the specified parameters"
            });
        }
        res.json({
            success: true,
            message: `Slot ${isAvailable ? 'enabled' : 'disabled'} successfully`,
            data: result
        });
    }
    catch (error) {
        console.error("Error toggling slot availability:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.toggleSlotAvailability = toggleSlotAvailability;
/**
 * Update slot booking count
 */
const updateSlotBooking = async (req, res) => {
    try {
        const { packageType, packageId, date, time, personsCount, operation = "add" } = req.body;
        if (!packageType || !packageId || !date || !time || personsCount === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: packageType, packageId, date, time, personsCount"
            });
        }
        if (!["add", "subtract"].includes(operation)) {
            return res.status(400).json({
                success: false,
                message: "Invalid operation. Must be 'add' or 'subtract'"
            });
        }
        const result = await timeSlot_service_1.TimeSlotService.updateSlotBooking(packageType, new mongoose_1.Types.ObjectId(packageId), date, time, personsCount, operation);
        res.json({
            success: true,
            message: `Slot booking ${operation === "add" ? "added" : "subtracted"} successfully`,
            data: { updated: result }
        });
    }
    catch (error) {
        console.error("Error updating slot booking:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.updateSlotBooking = updateSlotBooking;
/**
 * Update slots for a package (when package is modified)
 */
const updateSlotsForPackage = async (req, res) => {
    try {
        const { packageType, packageId, departureTimes, capacity } = req.body;
        if (!packageType || !packageId || !departureTimes || !capacity) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: packageType, packageId, departureTimes, capacity"
            });
        }
        if (!Array.isArray(departureTimes) || departureTimes.length === 0) {
            return res.status(400).json({
                success: false,
                message: "departureTimes must be a non-empty array"
            });
        }
        await timeSlot_service_1.TimeSlotService.updateSlotsForPackage(packageType, new mongoose_1.Types.ObjectId(packageId), departureTimes, capacity);
        res.json({
            success: true,
            message: "Package slots updated successfully"
        });
    }
    catch (error) {
        console.error("Error updating package slots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.updateSlotsForPackage = updateSlotsForPackage;
/**
 * Get slots summary for admin dashboard
 */
const getSlotsSummary = async (req, res) => {
    try {
        const { packageType, packageId, startDate, endDate } = req.query;
        if (!packageType || !packageId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: packageType, packageId"
            });
        }
        const summary = await timeSlot_service_1.TimeSlotService.getSlotsSummary(packageType, new mongoose_1.Types.ObjectId(packageId), startDate, endDate);
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error("Error getting slots summary:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.getSlotsSummary = getSlotsSummary;
/**
 * Delete all slots for a package
 */
const deleteSlotsForPackage = async (req, res) => {
    try {
        const { packageType, packageId } = req.params;
        if (!packageType || !packageId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: packageType, packageId"
            });
        }
        if (!["tour", "transfer"].includes(packageType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid packageType. Must be 'tour' or 'transfer'"
            });
        }
        await timeSlot_service_1.TimeSlotService.deleteSlotsForPackage(packageType, new mongoose_1.Types.ObjectId(packageId));
        res.json({
            success: true,
            message: "All slots deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting slots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.deleteSlotsForPackage = deleteSlotsForPackage;
/**
 * Debug: Get all time slots for a package
 */
const debugTimeSlots = async (req, res) => {
    try {
        const { packageId } = req.query;
        if (!packageId) {
            return res.status(400).json({
                success: false,
                message: "packageId query parameter is required"
            });
        }
        // Import TimeSlot model
        const TimeSlot = (await Promise.resolve().then(() => __importStar(require("../models/TimeSlot")))).default;
        // Get all time slots for this package
        const timeSlots = await TimeSlot.find({
            packageId: new mongoose_1.Types.ObjectId(packageId)
        }).sort({ date: 1 });
        const summary = {
            totalSlots: timeSlots.length,
            dateRange: timeSlots.length > 0 ? {
                start: timeSlots[0].date,
                end: timeSlots[timeSlots.length - 1].date
            } : null,
            sampleSlots: timeSlots.slice(0, 5), // First 5 slots
            uniqueDates: [...new Set(timeSlots.map(slot => slot.date))].length
        };
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error("Error getting debug time slots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.debugTimeSlots = debugTimeSlots;
/**
 * Get server's Malaysia timezone date and time
 */
const getServerDateTime = async (req, res) => {
    try {
        // Get current time in Malaysia timezone
        const now = new Date();
        const malaysiaDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // YYYY-MM-DD
        const malaysiaTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        const malaysiaFullDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        res.json({
            success: true,
            data: {
                date: malaysiaDate,
                time: malaysiaTime,
                fullDateTime: malaysiaFullDate.toISOString()
            }
        });
    }
    catch (error) {
        console.error("Error getting server date time:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.getServerDateTime = getServerDateTime;
