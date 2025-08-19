"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TourSchema = new mongoose_1.Schema({
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    image: String,
    tags: [String],
    description: String,
    type: { type: String, enum: ["co-tour", "private"] },
    packageType: { type: String, default: "tour" },
    duration: String,
    period: { type: String, enum: ["Half-Day", "Full-Day"], required: true },
    status: { type: String, enum: ["active", "sold"], default: "active" },
    bookedCount: { type: Number, default: 0 },
    oldPrice: Number,
    newPrice: Number,
    childPrice: Number,
    minimumPerson: Number,
    maximumPerson: Number,
    departureTimes: [String],
    label: { type: String, enum: ["Recommended", "Popular", "Best Value"], default: null },
    details: {
        about: String,
        itinerary: String,
        pickupLocation: String,
        note: String,
        faq: [
            {
                question: String,
                answer: String,
            },
        ],
    },
}, { timestamps: true });
// Add database indexes for better query performance
TourSchema.index({ slug: 1 }); // For slug-based lookups
TourSchema.index({ type: 1 }); // For type filtering
TourSchema.index({ status: 1 }); // For status filtering
TourSchema.index({ createdAt: -1 }); // For sorting by creation date
TourSchema.index({ title: 1 }); // For title search
exports.default = (0, mongoose_1.model)("Tour", TourSchema);
