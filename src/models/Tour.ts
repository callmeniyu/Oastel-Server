import { Schema, model, Document, Types } from "mongoose"
import { FAQType } from "./common"

export interface TourDetails {
    about: string
    itinerary: string
    pickupLocation: string
    pickupGuidelines?: string
    note?: string
    faq: Types.DocumentArray<FAQType>
}

export interface TourType extends Document {
    title: string
    slug: string
    image: string
    tags: string[]
    description: string
    type: "co-tour" | "private"
    packageType: "tour"
    duration: string
    period: "Half-Day" | "Full-Day"
    status: "active" | "sold"
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson?: number
    departureTimes: string[] // e.g. ["08:00 AM","01:30 PM"]
    label?: "Recommended" | "Popular" | "Best Value" | "Best seller"
    details: TourDetails
    lastSlotsGeneratedAt?: Date  // Track when slots were last generated
    createdAt: Date
    updatedAt: Date
}

const TourSchema = new Schema<TourType>(
    {
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
        label: { type: String, enum: ["Recommended", "Popular", "Best Value", "Best seller"], default: null },
        details: {
            about: String,
            itinerary: String,
            pickupLocation: String,
            pickupGuidelines: String,
            note: String,
            faq: [
                {
                    question: String,
                    answer: String,
                },
            ],
        },
        lastSlotsGeneratedAt: { type: Date }, // Track when slots were last generated to date
    },
    { timestamps: true }
)

// Add database indexes for better query performance
TourSchema.index({ slug: 1 }) // For slug-based lookups
TourSchema.index({ type: 1 }) // For type filtering
TourSchema.index({ status: 1 }) // For status filtering
TourSchema.index({ createdAt: -1 }) // For sorting by creation date
TourSchema.index({ title: 1 }) // For title search

export default model<TourType>("Tour", TourSchema)
