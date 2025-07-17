// src/models/Cart.ts
import { Schema, model, Document, Types } from "mongoose"

export interface CartItem {
  packageType: "tour"|"transfer"
  packageId: Types.ObjectId
  date: string
  time: string
  adults: number
  children: number
}

export interface CartType extends Document {
  userId: Types.ObjectId
  items: CartItem[]
  updatedAt: Date
}

const CartSchema = new Schema<CartType>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true },
    items: [
      {
        packageType: String,
        packageId: Schema.Types.ObjectId,
        date: String,
        time: String,
        adults: Number,
        children: Number,
      },
    ],
  },
  { timestamps: true }
)

export default model<CartType>("Cart", CartSchema)
