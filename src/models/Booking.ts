// src/models/Booking.ts
import { Schema, model, Document, Types } from "mongoose"

export interface BookingType extends Document {
  userId: Types.ObjectId        // reference User
  packageType: "tour"|"transfer"
  packageId: Types.ObjectId     // reference Tour or Transfer
  date: string                   // ISO date
  time: string
  adults: number
  children: number
  adultPrice: number
  childPrice: number
  totalPrice: number
  pickupLocations: string[]
  status: "pending"|"confirmed"|"cancelled"
  createdAt: Date
  updatedAt: Date
}

const BookingSchema = new Schema<BookingType>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    packageType: { type: String, enum: ["tour","transfer"], required: true },
    packageId: { type: Schema.Types.ObjectId, required: true, refPath: "packageType" },
    date: String,
    time: String,
    adults: Number,
    children: Number,
    adultPrice: Number,
    childPrice: Number,
    totalPrice: Number,
    pickupLocations: [String],
    status: { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" },
  },
  { timestamps: true }
)

export default model<BookingType>("Booking", BookingSchema)
