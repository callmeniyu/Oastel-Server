// src/models/TimeSlot.ts
import { Schema, model, Document, Types } from "mongoose"

export interface Slot {
  time: string
  capacity: number
  bookedCount: number
}

export interface TimeSlotType extends Document {
  packageType: "tour"|"transfer"
  packageId: Types.ObjectId
  date: string
  slots: Slot[]
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
      },
    ],
  },
  { timestamps: true }
)

export default model<TimeSlotType>("TimeSlot", TimeSlotSchema)
