import { Schema, model, Document } from "mongoose"

export interface VehicleType extends Document {
  name: string
  units: number // number of identical vehicles available
  seats: number // seats per vehicle
  createdAt: Date
  updatedAt: Date
}

const VehicleSchema = new Schema<VehicleType>(
  {
    name: { type: String, required: true, unique: true },
    units: { type: Number, required: true, default: 1 },
    seats: { type: Number, required: true, default: 4 },
  },
  { timestamps: true }
)

VehicleSchema.index({ name: 1 })

export default model<VehicleType>("Vehicle", VehicleSchema)
