import { Schema, model, Document, Types } from "mongoose"
import { FAQType } from "./common"

export interface TourDetails {
    about: string
    itinerary: string
    pickupLocation: string
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
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson?: number
    departureTimes: string[] // e.g. ["08:00 AM","01:30 PM"]
    label?: "Recommended" | "Popular" | "Best Value"
    details: TourDetails
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
        bookedCount: { type: Number, default: 0 },
        oldPrice: Number,
        newPrice: Number,
        childPrice: Number,
        minimumPerson: Number,
        maximumPerson: Number,
        departureTimes: [String],
        label: { type: String, enum: ["Recommended", "Popular", "Best Value"], default: null },
        details: {
            about: String,
            itinerary: String,
            pickupLocation: String,
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

export default model<TourType>("Tour", TourSchema)
