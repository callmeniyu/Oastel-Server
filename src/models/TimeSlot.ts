// src/models/TimeSlot.ts
import { Schema, model, Document, Types } from "mongoose"

export interface Slot {
  time: string
  capacity: number
  bookedCount: number
  isAvailable: boolean
  minimumPerson: number 
  cutoffTime?: Date
  price?: number
}

export interface TimeSlotType extends Document {
  packageType: "tour"|"transfer"
  packageId: Types.ObjectId
  date: string
  slots: Slot[]
  isAvailable: boolean
  booked: number
  capacity: number
  blackoutDate: boolean
  cutoffHours: number
}

const TimeSlotSchema = new Schema<TimeSlotType>(
  {
    packageType: { type: String, enum: ["tour","transfer"], required: true },
    packageId: { type: Schema.Types.ObjectId, required: true, refPath: "packageType" },
    date: { type: String, required: true },
    slots: [
      {
        time: String,
        capacity: Number,
        bookedCount: { type: Number, default: 0 },
        isAvailable: { type: Boolean, default: true },
        minimumPerson: { type: Number }, // No default, will be set from package data
        cutoffTime: { type: Date }, // For 10-hour cutoff rule
        price: { type: Number }, // Dynamic pricing per slot
      },
    ],
    isAvailable: { type: Boolean, default: true },
    booked: { type: Number, default: 0 },
    capacity: { type: Number, required: true },
    blackoutDate: { type: Boolean, default: false },
    cutoffHours: { type: Number, default: 10 }, // Configurable cutoff hours
  },
  { timestamps: true }
)

export default model<TimeSlotType>("TimeSlot", TimeSlotSchema)
