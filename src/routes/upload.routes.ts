import { Router, Request, Response } from "express"
import { uploadTourImage, processImage, deleteOldImage } from "../middleware/upload"
import path from "path"

const router = Router()

// Upload single tour image
router.post("/tour-image", uploadTourImage, processImage, (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            })
        }

        // Cloudinary returns the full URL in req.file.path
        const imageUrl = req.file.path

        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        })
    } catch (error: any) {
        console.error("Upload error:", error)
        res.status(500).json({
            success: false,
            message: "Error uploading image",
            error: error.message,
        })
    }
})

// Delete image endpoint
router.delete("/tour-image", (req: Request, res: Response) => {
    try {
        const { imagePath } = req.body

        if (!imagePath) {
            return res.status(400).json({
                success: false,
                message: "Image path is required",
            })
        }

        deleteOldImage(imagePath)

        res.status(200).json({
            success: true,
            message: "Image deleted successfully",
        })
    } catch (error: any) {
        console.error("Delete error:", error)
        res.status(500).json({
            success: false,
            message: "Error deleting image",
            error: error.message,
        })
    }
})

export default router
