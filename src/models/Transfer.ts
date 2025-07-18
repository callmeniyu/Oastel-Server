// src/models/Transfer.ts
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
    slug: string
    title: string
    image: string
    from: string
    to: string
    tags: string[]
    desc: string
    type: "Van" | "Van + Ferry" | "Private"
    packageType: "transfer"
    duration: string
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson?: number
    times: string[] // e.g. ["08:00 AM","05:00 PM"]
    label?: "Recommended" | "Popular" | "Best Value"
    status: "active" | "sold"
    details: TransferDetails
    createdAt: Date
    updatedAt: Date
}

const TransferSchema = new Schema<TransferType>(
    {
        slug: { type: String, required: true, unique: true },
        title: String,
        image: String,
        from: String,
        to: String,
        tags: [String],
        desc: String,
        type: { type: String, enum: ["Van", "Van + Ferry", "Private"] },
        packageType: { type: String, default: "transfer" },
        duration: String,
        bookedCount: { type: Number, default: 0 },
        oldPrice: Number,
        newPrice: Number,
        childPrice: Number,
        minimumPerson: Number,
        maximumPerson: Number,
        times: [String],
        label: { type: String, enum: ["Recommended", "Popular", "Best Value"], default: null },
        status: { type: String, enum: ["active", "sold"], default: "active" },
        details: {
            about: String,
            itinerary: String,
            pickupOption: { type: String, enum: ["admin", "user"], default: "admin" },
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

export default model<TransferType>("Transfer", TransferSchema)
