"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TransferSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: String,
    tags: [String],
    desc: String,
    type: { type: String, enum: ["Van", "Van + Ferry", "Private"] },
    vehicle: { type: String }, // Vehicle name for private transfers
    packageType: { type: String, default: "transfer" },
    duration: String,
    status: { type: String, enum: ["active", "sold"], default: "active" },
    bookedCount: { type: Number, default: 0 },
    oldPrice: Number,
    newPrice: Number,
    childPrice: Number,
    minimumPerson: Number,
    maximumPerson: Number,
    times: [String],
    label: { type: String, enum: ["Recommended", "Popular", "Best Value"], default: null },
    from: String,
    to: String,
    details: {
        about: String,
        itinerary: String,
        pickupOption: { type: String, enum: ["admin", "user"] },
        pickupLocations: String,
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
TransferSchema.index({ slug: 1 }); // For slug-based lookups
TransferSchema.index({ type: 1 }); // For type filtering
TransferSchema.index({ status: 1 }); // For status filtering
TransferSchema.index({ createdAt: -1 }); // For sorting by creation date
exports.default = (0, mongoose_1.model)("Transfer", TransferSchema);
