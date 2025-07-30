import { Router, Request, Response, NextFunction } from "express"
import { uploadTourImage, uploadBlogImage, uploadTransferImage, processImage, deleteOldImage } from "../middleware/upload"
import path from "path"

const router = Router()

// Error handling middleware for multer errors
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 5MB"
        })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: "Unexpected field name for file upload"
        })
    }
    next(err)
}

// Upload single tour image
router.post("/tour-image", (req: Request, res: Response, next: NextFunction) => {
    uploadTourImage(req, res, (err: any) => {
        if (err) {
            console.error("Multer Error:", err)
            return res.status(400).json({
                success: false,
                message: err.message || "Error uploading file"
            })
        }
        next()
    })
}, processImage, (req: Request, res: Response) => {
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

// Upload single blog image
router.post("/blog-image", uploadBlogImage, processImage, (req: Request, res: Response) => {
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
            message: "Blog image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        })
    } catch (error: any) {
        console.error("Blog upload error:", error)
        res.status(500).json({
            success: false,
            message: "Error uploading blog image",
            error: error.message,
        })
    }
})

// Upload single transfer image
router.post("/transfer-image", uploadTransferImage, processImage, (req: Request, res: Response) => {
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
            message: "Transfer image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        })
    } catch (error: any) {
        console.error("Transfer upload error:", error)
        res.status(500).json({
            success: false,
            message: "Error uploading transfer image",
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
