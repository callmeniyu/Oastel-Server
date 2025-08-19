"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadTransferImage = exports.uploadBlogImage = exports.uploadTourImage = exports.deleteOldImage = exports.processImage = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const env_1 = require("../config/env");
// Configure Cloudinary with validated environment variables
cloudinary_1.v2.config({
    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.env.CLOUDINARY_API_KEY,
    api_secret: env_1.env.CLOUDINARY_API_SECRET,
});
// Configure Cloudinary storage for tours
const tourStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
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
        public_id: (req, file) => {
            // Generate unique public ID
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            return `tour-${uniqueSuffix}`;
        },
    },
});
// Configure Cloudinary storage for blogs
const blogStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: "oastel/blogs", // Folder in Cloudinary
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            {
                width: 1200,
                height: 800,
                crop: "fill",
                quality: "auto:good",
            },
        ],
        public_id: (req, file) => {
            // Generate unique public ID
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            return `blog-${uniqueSuffix}`;
        },
    },
});
// Configure Cloudinary storage for transfers
const transferStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: "oastel/transfers", // Folder in Cloudinary
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            {
                width: 1200,
                height: 800,
                crop: "fill",
                quality: "auto:good",
            },
        ],
        public_id: (req, file) => {
            // Generate unique public ID
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            return `transfer-${uniqueSuffix}`;
        },
    },
});
// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image files are allowed!"));
    }
};
// Configure multer with Cloudinary storage for tours
const tourUpload = (0, multer_1.default)({
    storage: tourStorage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// Configure multer with Cloudinary storage for blogs
const blogUpload = (0, multer_1.default)({
    storage: blogStorage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// Configure multer with Cloudinary storage for transfers
const transferUpload = (0, multer_1.default)({
    storage: transferStorage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// No need for image processing middleware - Cloudinary handles it
const processImage = async (req, res, next) => {
    // Cloudinary automatically processes images, so we just continue
    next();
};
exports.processImage = processImage;
// Delete image from Cloudinary
const deleteOldImage = async (imagePath) => {
    try {
        if (imagePath && imagePath.includes("cloudinary.com")) {
            // Extract public_id from Cloudinary URL
            const urlParts = imagePath.split("/");
            const filename = urlParts[urlParts.length - 1];
            let publicId = "";
            // Determine folder based on URL path
            if (imagePath.includes("/tours/")) {
                publicId = `oastel/tours/${filename.split(".")[0]}`;
            }
            else if (imagePath.includes("/blogs/")) {
                publicId = `oastel/blogs/${filename.split(".")[0]}`;
            }
            else if (imagePath.includes("/transfers/")) {
                publicId = `oastel/transfers/${filename.split(".")[0]}`;
            }
            if (publicId) {
                await cloudinary_1.v2.uploader.destroy(publicId);
                console.log(`Deleted image from Cloudinary: ${publicId}`);
            }
        }
    }
    catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
    }
};
exports.deleteOldImage = deleteOldImage;
exports.uploadTourImage = tourUpload.single("image");
exports.uploadBlogImage = blogUpload.single("image");
exports.uploadTransferImage = transferUpload.single("image");
