import { Schema, model, Document } from "mongoose"

export interface BlogType extends Document {
    title: string
    slug: string
    image: string
    description: string
    category: "Travel Tips" | "Local Culture" | "Food & Cuisine" | "Adventure & Nature" | "Stay" | "Transportation"
    views: number
    publishDate: Date
    content: string
    createdAt: Date
    updatedAt: Date
}

const BlogSchema = new Schema<BlogType>(
    {
        title: { type: String, required: true, index: true },
        slug: { type: String, required: true, unique: true },
        image: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            enum: ["Travel Tips", "Local Culture", "Food & Cuisine", "Adventure & Nature", "Stay", "Transportation"],
            required: true,
            index: true,
        },
        views: { type: Number, default: 0 },
        publishDate: { type: Date, required: true },
        content: { type: String, required: true },
    },
    {
        timestamps: true,
    }
)

// Create indexes for better query performance
BlogSchema.index({ createdAt: -1 })
BlogSchema.index({ publishDate: -1 })
BlogSchema.index({ category: 1, publishDate: -1 })

const Blog = model<BlogType>("Blog", BlogSchema)

export default Blog
