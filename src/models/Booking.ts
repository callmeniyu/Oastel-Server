import mongoose, { Schema, Document } from "mongoose";

export interface PaymentInfo {
  paymentIntentId?: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed';
  amount: number;
  bankCharge: number;
  currency: string;
  paymentMethod?: string;
  failedReason?: string;
  updatedAt?: Date;
  refundStatus?: 'none' | 'partial' | 'full';
  refundAmount?: number;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
}

export interface Booking extends Document {
  userId?: mongoose.Types.ObjectId;
  packageType: "tour" | "transfer";
  packageId: mongoose.Types.ObjectId;
  slotId?: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  adults: number;
  children: number;
  pickupLocation: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  firstBookingMinimum: boolean;
  contactInfo: ContactInfo;
  paymentInfo: PaymentInfo;
  subtotal: number;
  total: number;
  isAdminBooking?: boolean;
  // For private-transfer (per-vehicle) bookings
  isVehicleBooking?: boolean;
  vehicleSeatCapacity?: number;
  seatsRequested?: number;
  reviewEmailSent?: boolean;
  reviewEmailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: false, ref: "User" },
    packageType: { type: String, enum: ["tour", "transfer"], required: true },
    packageId: { type: Schema.Types.ObjectId, required: true, refPath: "packageType" },
    slotId: { type: Schema.Types.ObjectId, required: false, ref: "TimeSlot" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, required: true, min: 0 },
    pickupLocation: { type: String, required: true },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
    firstBookingMinimum: { type: Boolean, default: false },
    contactInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      whatsapp: String
    },
    paymentInfo: {
      paymentIntentId: String,
      stripePaymentIntentId: String,
      stripeSessionId: String,
      paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'succeeded', 'failed'],
        default: 'pending'
      },
      amount: { type: Number, required: true },
      bankCharge: { type: Number, required: true },
      currency: { type: String, default: 'MYR' },
      paymentMethod: String,
      failedReason: String,
      updatedAt: Date,
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
  // For private transfer bookings
  isVehicleBooking: { type: Boolean, default: false },
  vehicleSeatCapacity: { type: Number },
  seatsRequested: { type: Number },
    reviewEmailSent: { type: Boolean, default: false },
    reviewEmailSentAt: { type: Date },
  },
  { timestamps: true }
);

// Add database indexes for better query performance
BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ packageId: 1, date: 1 });
BookingSchema.index({ slotId: 1 });
BookingSchema.index({ status: 1, date: 1 });
BookingSchema.index({ 'paymentInfo.paymentStatus': 1 });
BookingSchema.index({ 'paymentInfo.stripePaymentIntentId': 1 });
BookingSchema.index({ 'paymentInfo.stripeSessionId': 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ reviewEmailSent: 1, date: 1 }); // For review email scheduler

// CRITICAL: Unique sparse index to prevent duplicate bookings with the same payment intent
// Sparse index allows multiple null values but enforces uniqueness for non-null values
BookingSchema.index({ 'paymentInfo.stripePaymentIntentId': 1 }, { 
  unique: true, 
  sparse: true,
  name: 'unique_stripe_payment_intent' 
});

// Additional compound index to detect duplicate bookings based on key details
// This catches duplicates even if payment intent differs (e.g., retry scenarios)
BookingSchema.index(
  { 
    'contactInfo.email': 1, 
    packageId: 1, 
    date: 1, 
    time: 1,
    'paymentInfo.paymentStatus': 1,
    createdAt: 1
  },
  { name: 'duplicate_booking_detection' }
);

export default mongoose.models.Booking || mongoose.model<Booking>("Booking", BookingSchema);
