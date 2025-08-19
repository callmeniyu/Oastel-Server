"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSlugAvailability = exports.updateTourStatus = exports.deleteTour = exports.updateTour = exports.getTourBySlug = exports.getTourById = exports.getTours = exports.createTour = void 0;
const Tour_1 = __importDefault(require("../models/Tour"));
const generateSlug_1 = require("../utils/generateSlug");
const timeSlot_service_1 = require("../services/timeSlot.service");
const createTour = async (req, res) => {
    try {
        const tourData = req.body;
        // Ensure packageType is always 'tour'
        tourData.packageType = "tour";
        // Generate slug if not provided
        if (!tourData.slug) {
            tourData.slug = (0, generateSlug_1.generateSlug)(tourData.title);
        }
        // Validate slug uniqueness
        const existingTour = await Tour_1.default.findOne({ slug: tourData.slug });
        if (existingTour) {
            return res.status(400).json({
                success: false,
                message: "A tour with this slug already exists",
            });
        }
        // Filter out empty FAQ items
        if (tourData.details && tourData.details.faq) {
            tourData.details.faq = tourData.details.faq.filter((faq) => faq.question.trim() && faq.answer.trim());
        }
        // Handle label - convert "None" to null
        if (tourData.label === "None") {
            tourData.label = null;
        }
        const tour = new Tour_1.default(tourData);
        const savedTour = await tour.save();
        // Generate time slots for the tour (90 days ahead)
        try {
            await timeSlot_service_1.TimeSlotService.generateSlotsForPackage("tour", savedTour._id, tourData.departureTimes || [], tourData.maximumPerson || 10);
            console.log(`Time slots generated for tour: ${savedTour._id}`);
        }
        catch (slotError) {
            console.error("Error generating time slots for tour:", slotError);
            // Don't fail the tour creation if slot generation fails
        }
        res.status(201).json({
            success: true,
            message: "Tour created successfully",
            data: savedTour,
        });
    }
    catch (error) {
        console.error("Error creating tour:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A tour with this slug already exists",
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createTour = createTour;
const getTours = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, search } = req.query;
        const query = {};
        if (type && type !== "all") {
            query.type = type;
        }
        if (search) {
            query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const tours = await Tour_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(); // Use lean() for better performance
        const total = await Tour_1.default.countDocuments(query);
        res.json({
            success: true,
            data: tours,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching tours:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getTours = getTours;
const getTourById = async (req, res) => {
    try {
        const { id } = req.params;
        const tour = await Tour_1.default.findById(id).lean(); // Use lean() for better performance
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        res.json({
            success: true,
            data: tour,
        });
    }
    catch (error) {
        console.error("Error fetching tour:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getTourById = getTourById;
const getTourBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const tour = await Tour_1.default.findOne({ slug }).lean(); // Use lean() for better performance
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        res.json({
            success: true,
            data: tour,
        });
    }
    catch (error) {
        console.error("Error fetching tour:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getTourBySlug = getTourBySlug;
const updateTour = async (req, res) => {
    try {
        const { id } = req.params;
        const tourData = req.body;
        // Get existing tour to check if image changed
        const existingTour = await Tour_1.default.findById(id);
        if (!existingTour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        // Ensure packageType is always 'tour'
        tourData.packageType = "tour";
        // Handle label - convert "None" to null
        if (tourData.label === "None") {
            tourData.label = null;
        }
        // Filter out empty FAQ items
        if (tourData.details && tourData.details.faq) {
            tourData.details.faq = tourData.details.faq.filter((faq) => faq.question.trim() && faq.answer.trim());
        }
        // Note: With Cloudinary, we don't need to delete old images locally
        // Cloudinary handles storage and we can optionally clean up old images via their API
        const tour = await Tour_1.default.findByIdAndUpdate(id, tourData, { new: true, runValidators: true });
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        // Update time slots if departure times or capacity changed
        try {
            const departureTimes = tourData.departureTimes || existingTour.departureTimes;
            const capacity = tourData.maximumPerson || existingTour.maximumPerson || 10;
            if (JSON.stringify(departureTimes) !== JSON.stringify(existingTour.departureTimes) ||
                capacity !== existingTour.maximumPerson) {
                await timeSlot_service_1.TimeSlotService.updateSlotsForPackage("tour", tour._id, departureTimes, capacity);
                console.log(`Time slots updated for tour: ${tour._id}`);
            }
        }
        catch (slotError) {
            console.error("Error updating time slots for tour:", slotError);
            // Don't fail the tour update if slot update fails
        }
        res.json({
            success: true,
            message: "Tour updated successfully",
            data: tour,
        });
    }
    catch (error) {
        console.error("Error updating tour:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateTour = updateTour;
const deleteTour = async (req, res) => {
    try {
        const { id } = req.params;
        const tour = await Tour_1.default.findByIdAndDelete(id);
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        // Delete all time slots for this tour
        try {
            await timeSlot_service_1.TimeSlotService.deleteSlotsForPackage("tour", tour._id);
            console.log(`Time slots deleted for tour: ${tour._id}`);
        }
        catch (slotError) {
            console.error("Error deleting time slots for tour:", slotError);
            // Don't fail the tour deletion if slot deletion fails
        }
        res.json({
            success: true,
            message: "Tour deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting tour:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteTour = deleteTour;
const updateTourStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !["active", "sold"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'active' or 'sold'",
            });
        }
        const tour = await Tour_1.default.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            });
        }
        res.json({
            success: true,
            message: "Tour status updated successfully",
            data: tour,
        });
    }
    catch (error) {
        console.error("Error updating tour status:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateTourStatus = updateTourStatus;
const checkSlugAvailability = async (req, res) => {
    try {
        const { slug } = req.params;
        const { excludeId } = req.query;
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        const existingTour = await Tour_1.default.findOne(query);
        res.json({
            success: true,
            available: !existingTour,
        });
    }
    catch (error) {
        console.error("Error checking slug availability:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.checkSlugAvailability = checkSlugAvailability;
