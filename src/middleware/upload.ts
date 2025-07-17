import multer from "multer"
import path from "path"
import fs from "fs"
import sharp from "sharp"
import { Request, Response, NextFunction } from "express"

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads/tours")
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir)
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
        const extension = path.extname(file.originalname)
        cb(null, `tour-${uniqueSuffix}${extension}`)
    },
})

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true)
    } else {
        cb(new Error("Only image files are allowed!"))
    }
}

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
})

// Image processing middleware
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
        return next()
    }

    try {
        const originalPath = req.file.path
        const processedPath = originalPath.replace(/\.[^/.]+$/, "-processed.jpg")

        // Process image with sharp - resize and optimize
        await sharp(originalPath)
            .resize(1200, 800, {
                fit: "cover",
                position: "center",
            })
            .jpeg({ quality: 85 })
            .toFile(processedPath)

        // Delete original file (with retry for Windows)
        setTimeout(() => {
            try {
                if (fs.existsSync(originalPath)) {
                    fs.unlinkSync(originalPath)
                }
            } catch (unlinkError) {
                console.warn("Could not delete original file:", unlinkError)
            }
        }, 100)

        // Update file path
        req.file.path = processedPath
        req.file.filename = path.basename(processedPath)

        next()
    } catch (error) {
        console.error("Error processing image:", error)
        next(error)
    }
}

// Delete old image file
export const deleteOldImage = (imagePath: string) => {
    try {
        if (imagePath && imagePath.startsWith("/uploads/")) {
            const fullPath = path.join(__dirname, "../..", imagePath)
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
            }
        }
    } catch (error) {
        console.error("Error deleting old image:", error)
    }
}

export const uploadTourImage = upload.single("image")
