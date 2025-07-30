import { Request, Response } from "express"
import { Types } from "mongoose"
import Transfer, { TransferType } from "../models/Transfer"
import { generateSlug } from "../utils/generateSlug"
import { TimeSlotService } from "../services/timeSlot.service"

export const createTransfer = async (req: Request, res: Response) => {
    try {
        const transferData = req.body

        // Ensure packageType is always 'transfer'
        transferData.packageType = "transfer"

        // Generate slug if not provided
        if (!transferData.slug) {
            transferData.slug = generateSlug(transferData.title)
        }

        // Validate slug uniqueness
        const existingTransfer = await Transfer.findOne({ slug: transferData.slug })
        if (existingTransfer) {
            return res.status(400).json({
                success: false,
                message: "A transfer with this slug already exists",
            })
        }

        // Filter out empty FAQ items
        if (transferData.details && transferData.details.faq) {
            transferData.details.faq = transferData.details.faq.filter(
                (faq: any) => faq.question.trim() && faq.answer.trim()
            )
        }

        // Handle label - convert "None" to null
        if (transferData.label === "None") {
            transferData.label = null
        }

        const transfer = new Transfer(transferData)
        const savedTransfer = await transfer.save()

        // Generate time slots for the transfer (90 days ahead)
        try {
            await TimeSlotService.generateSlotsForPackage(
                "transfer",
                savedTransfer._id as Types.ObjectId,
                transferData.times || [],
                transferData.maximumPerson || 10
            )
            console.log(`Time slots generated for transfer: ${savedTransfer._id}`)
        } catch (slotError) {
            console.error("Error generating time slots for transfer:", slotError)
            // Don't fail the transfer creation if slot generation fails
        }

        res.status(201).json({
            success: true,
            message: "Transfer created successfully",
            data: savedTransfer,
        })
    } catch (error: any) {
        console.error("Error creating transfer:", error)

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
                message: "A transfer with this slug already exists",
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTransfers = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, type, search } = req.query

        const query: any = {}

        if (type && type !== "all") {
            query.type = type
        }

        if (search) {
            query.$or = [{ title: { $regex: search, $options: "i" } }, { desc: { $regex: search, $options: "i" } }]
        }

        const skip = (Number(page) - 1) * Number(limit)

        const transfers = await Transfer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean() // Use lean() for better performance

        const total = await Transfer.countDocuments(query)

        res.json({
            success: true,
            data: transfers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        })
    } catch (error: any) {
        console.error("Error fetching transfers:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTransferById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const transfer = await Transfer.findById(id).lean() // Use lean() for better performance

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        res.json({
            success: true,
            data: transfer,
        })
    } catch (error: any) {
        console.error("Error fetching transfer:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getTransferBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params
        const transfer = await Transfer.findOne({ slug }).lean() // Use lean() for better performance

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        res.json({
            success: true,
            data: transfer,
        })
    } catch (error: any) {
        console.error("Error fetching transfer:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const updateTransfer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const transferData = req.body

        // Get existing transfer to check if image changed
        const existingTransfer = await Transfer.findById(id)
        if (!existingTransfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        // Ensure packageType is always 'transfer'
        transferData.packageType = "transfer"

        // Handle label - convert "None" to null
        if (transferData.label === "None") {
            transferData.label = null
        }

        // Filter out empty FAQ items
        if (transferData.details && transferData.details.faq) {
            transferData.details.faq = transferData.details.faq.filter(
                (faq: any) => faq.question.trim() && faq.answer.trim()
            )
        }

        // Note: With Cloudinary, we don't need to delete old images locally
        // Cloudinary handles storage and we can optionally clean up old images via their API

        const transfer = await Transfer.findByIdAndUpdate(id, transferData, { new: true, runValidators: true })

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        // Update time slots if times or capacity changed
        try {
            const times = transferData.times || existingTransfer.times
            const capacity = transferData.maximumPerson || existingTransfer.maximumPerson || 10
            
            if (JSON.stringify(times) !== JSON.stringify(existingTransfer.times) || 
                capacity !== existingTransfer.maximumPerson) {
                await TimeSlotService.updateSlotsForPackage(
                    "transfer",
                    transfer._id as Types.ObjectId,
                    times,
                    capacity
                )
                console.log(`Time slots updated for transfer: ${transfer._id}`)
            }
        } catch (slotError) {
            console.error("Error updating time slots for transfer:", slotError)
            // Don't fail the transfer update if slot update fails
        }

        res.json({
            success: true,
            message: "Transfer updated successfully",
            data: transfer,
        })
    } catch (error: any) {
        console.error("Error updating transfer:", error)

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

export const deleteTransfer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const transfer = await Transfer.findByIdAndDelete(id)

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        // Delete all time slots for this transfer
        try {
            await TimeSlotService.deleteSlotsForPackage("transfer", transfer._id as Types.ObjectId)
            console.log(`Time slots deleted for transfer: ${transfer._id}`)
        } catch (slotError) {
            console.error("Error deleting time slots for transfer:", slotError)
            // Don't fail the transfer deletion if slot deletion fails
        }

        res.json({
            success: true,
            message: "Transfer deleted successfully",
        })
    } catch (error: any) {
        console.error("Error deleting transfer:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const updateTransferStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!status || !["active", "sold"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'active' or 'sold'",
            })
        }

        const transfer = await Transfer.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
        }

        res.json({
            success: true,
            message: "Transfer status updated successfully",
            data: transfer,
        })
    } catch (error: any) {
        console.error("Error updating transfer status:", error)
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

        const existingTransfer = await Transfer.findOne(query)

        res.json({
            success: true,
            available: !existingTransfer,
        })
    } catch (error: any) {
        console.error("Error checking slug availability:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
