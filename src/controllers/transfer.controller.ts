import { Request, Response } from "express"
import Transfer, { TransferType } from "../models/Transfer"
import { generateSlug } from "../utils/generateSlug"

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

        // Ensure status is set (default to "active" if not provided)
        if (!transferData.status) {
            transferData.status = "active"
        }

        const transfer = new Transfer(transferData)
        const savedTransfer = await transfer.save()

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
        const { page = 1, limit = 10, type, search, status } = req.query

        const query: any = {}

        if (type && type !== "all") {
            query.type = type
        }

        if (status && status !== "all") {
            query.status = status
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { desc: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search as string, "i")] } },
                { from: { $regex: search, $options: "i" } },
                { to: { $regex: search, $options: "i" } },
            ]
        }

        const skip = (Number(page) - 1) * Number(limit)

        const transfers = await Transfer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))

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

        const transfer = await Transfer.findById(id)

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

        const transfer = await Transfer.findOne({ slug })

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
        const updateData = req.body

        // Ensure packageType is always 'transfer'
        updateData.packageType = "transfer"

        // Handle label - convert "None" to null
        if (updateData.label === "None") {
            updateData.label = null
        }

        // Filter out empty FAQ items
        if (updateData.details && updateData.details.faq) {
            updateData.details.faq = updateData.details.faq.filter((faq: any) => faq.question.trim() && faq.answer.trim())
        }

        // If slug is being updated, check for uniqueness
        if (updateData.slug) {
            const existingTransfer = await Transfer.findOne({ slug: updateData.slug, _id: { $ne: id } })
            if (existingTransfer) {
                return res.status(400).json({
                    success: false,
                    message: "A transfer with this slug already exists",
                })
            }
        }

        const transfer = await Transfer.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found",
            })
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

export const updateTransferStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!["active", "sold"].includes(status)) {
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

export const checkSlugAvailability = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params

        const existingTransfer = await Transfer.findOne({ slug })

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
