import { Schema, model, Document, Types } from "mongoose"
import { FAQType } from "./common"

export interface TransferDetails {
    about: string
    itinerary: string
    pickupOption: "admin" | "user"
    pickupLocations: string
    note?: string
    faq: Types.DocumentArray<FAQType>
}

export interface TransferType extends Document {
    title: string
    slug: string
    image: string
    tags: string[]
    desc: string
    type: "Van" | "Van + Ferry" | "Private"
    packageType: "transfer"
    duration: string
    status: "active" | "sold"
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson?: number
    times: string[] // e.g. ["08:00 AM","01:30 PM"]
    label?: "Recommended" | "Popular" | "Best Value"
    from: string
    to: string
    details: TransferDetails
    createdAt: Date
    updatedAt: Date
}

const TransferSchema = new Schema<TransferType>(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        image: String,
        tags: [String],
        desc: String,
        type: { type: String, enum: ["Van", "Van + Ferry", "Private"] },
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
    },
    { timestamps: true }
)

// Add database indexes for better query performance
TransferSchema.index({ slug: 1 }) // For slug-based lookups
TransferSchema.index({ type: 1 }) // For type filtering
TransferSchema.index({ status: 1 }) // For status filtering
TransferSchema.index({ createdAt: -1 }) // For sorting by creation date

export default model<TransferType>("Transfer", TransferSchema)
