import { Request, Response } from "express"
import Tour, { TourType } from "../models/Tour"
import { generateSlug } from "../utils/generateSlug"
import { deleteOldImage } from "../middleware/upload"

export const createTour = async (req: Request, res: Response) => {
    try {
        const tourData = req.body

        // Ensure packageType is always 'tour'
        tourData.packageType = "tour"

        // Generate slug if not provided
        if (!tourData.slug) {
            tourData.slug = generateSlug(tourData.title)
        }

        // Validate slug uniqueness
        const existingTour = await Tour.findOne({ slug: tourData.slug })
        if (existingTour) {
            return res.status(400).json({
                success: false,
                message: "A tour with this slug already exists",
            })
        }

        // Filter out empty FAQ items
        if (tourData.details && tourData.details.faq) {
            tourData.details.faq = tourData.details.faq.filter((faq: any) => faq.question.trim() && faq.answer.trim())
        }

        // Handle label - convert "None" to null
        if (tourData.label === "None") {
            tourData.label = null
        }

        const tour = new Tour(tourData)
        const savedTour = await tour.save()

        res.status(201).json({
            success: true,
            message: "Tour created successfully",
            data: savedTour,
        })
    } catch (error: any) {
        console.error("Error creating tour:", error)

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            })
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A tour with this slug already exists",
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTours = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, type, search } = req.query

        const query: any = {}

        if (type && type !== "all") {
            query.type = type
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search as string, "i")] } },
            ]
        }

        const skip = (Number(page) - 1) * Number(limit)

        const tours = await Tour.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))

        const total = await Tour.countDocuments(query)

        res.json({
            success: true,
            data: tours,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        })
    } catch (error: any) {
        console.error("Error fetching tours:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTourById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const tour = await Tour.findById(id)

        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            })
        }

        res.json({
            success: true,
            data: tour,
        })
    } catch (error: any) {
        console.error("Error fetching tour:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTourBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params
        const tour = await Tour.findOne({ slug })

        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            })
        }

        res.json({
            success: true,
            data: tour,
        })
    } catch (error: any) {
        console.error("Error fetching tour:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const updateTour = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const tourData = req.body

        // Get existing tour to check if image changed
        const existingTour = await Tour.findById(id)
        if (!existingTour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            })
        }

        // Ensure packageType is always 'tour'
        tourData.packageType = "tour"

        // Handle label - convert "None" to null
        if (tourData.label === "None") {
            tourData.label = null
        }

        // Filter out empty FAQ items
        if (tourData.details && tourData.details.faq) {
            tourData.details.faq = tourData.details.faq.filter((faq: any) => faq.question.trim() && faq.answer.trim())
        }

        // If image is changed and old image was uploaded (starts with /uploads/), delete it
        if (tourData.image && tourData.image !== existingTour.image && existingTour.image?.startsWith("/uploads/")) {
            deleteOldImage(existingTour.image)
        }

        const tour = await Tour.findByIdAndUpdate(id, tourData, { new: true, runValidators: true })

        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            })
        }

        res.json({
            success: true,
            message: "Tour updated successfully",
            data: tour,
        })
    } catch (error: any) {
        console.error("Error updating tour:", error)

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const deleteTour = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const tour = await Tour.findByIdAndDelete(id)

        if (!tour) {
            return res.status(404).json({
                success: false,
                message: "Tour not found",
            })
        }

        res.json({
            success: true,
            message: "Tour deleted successfully",
        })
    } catch (error: any) {
        console.error("Error deleting tour:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const checkSlugAvailability = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params
        const { excludeId } = req.query

        const query: any = { slug }
        if (excludeId) {
            query._id = { $ne: excludeId }
        }

        const existingTour = await Tour.findOne(query)

        res.json({
            success: true,
            available: !existingTour,
        })
    } catch (error: any) {
        console.error("Error checking slug availability:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
