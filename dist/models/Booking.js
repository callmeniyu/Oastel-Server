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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const BookingSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: false, ref: "User" },
    packageType: { type: String, enum: ["tour", "transfer"], required: true },
    packageId: { type: mongoose_1.Schema.Types.ObjectId, required: true, refPath: "packageType" },
    slotId: { type: mongoose_1.Schema.Types.ObjectId, required: false, ref: "TimeSlot" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, required: true, min: 0 },
    pickupLocation: { type: String, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    firstBookingMinimum: { type: Boolean, default: false },
    contactInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        whatsapp: String
    },
    paymentInfo: {
        paymentIntentId: String,
        paymentStatus: {
            type: String,
            enum: ['pending', 'processing', 'succeeded', 'failed'],
            default: 'pending'
        },
        amount: { type: Number, required: true },
        bankCharge: { type: Number, required: true },
        currency: { type: String, default: 'MYR' },
        paymentMethod: String,
        refundStatus: {
            type: String,
            enum: ['none', 'partial', 'full'],
            default: 'none'
        },
        refundAmount: Number
    },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    isAdminBooking: { type: Boolean, default: false },
    reviewEmailSent: { type: Boolean, default: false },
    reviewEmailSentAt: { type: Date },
}, { timestamps: true });
// Add database indexes for better query performance
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ packageId: 1, date: 1 });
BookingSchema.index({ slotId: 1 });
BookingSchema.index({ status: 1, date: 1 });
BookingSchema.index({ 'paymentInfo.paymentStatus': 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ reviewEmailSent: 1, date: 1 }); // For review email scheduler
exports.default = mongoose_1.default.models.Booking || mongoose_1.default.model("Booking", BookingSchema);
