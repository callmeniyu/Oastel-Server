import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import { Request, Response, NextFunction } from "express"

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "oastel/tours", // Folder in Cloudinary
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            {
                width: 1200,
                height: 800,
                crop: "fill",
                quality: "auto:good",
            },
        ],
        public_id: (req: any, file: any) => {
            // Generate unique public ID
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
            return `tour-${uniqueSuffix}`
        },
    } as any,
})

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true)
    } else {
        cb(new Error("Only image files are allowed!"))
    }
}

// Configure multer with Cloudinary storage
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
})

// No need for image processing middleware - Cloudinary handles it
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
    // Cloudinary automatically processes images, so we just continue
    next()
}

// Delete image from Cloudinary
export const deleteOldImage = async (imagePath: string) => {
    try {
        if (imagePath && imagePath.includes("cloudinary.com")) {
            // Extract public_id from Cloudinary URL
            const urlParts = imagePath.split("/")
            const filename = urlParts[urlParts.length - 1]
            const publicId = `oastel/tours/${filename.split(".")[0]}`

            await cloudinary.uploader.destroy(publicId)
            console.log(`Deleted image from Cloudinary: ${publicId}`)
        }
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error)
    }
}

export const uploadTourImage = upload.single("image")
