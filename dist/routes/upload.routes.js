"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 5MB"
        });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: "Unexpected field name for file upload"
        });
    }
    next(err);
};
// Upload single tour image
router.post("/tour-image", (req, res, next) => {
    (0, upload_1.uploadTourImage)(req, res, (err) => {
        if (err) {
            console.error("Multer Error:", err);
            return res.status(400).json({
                success: false,
                message: err.message || "Error uploading file"
            });
        }
        next();
    });
}, upload_1.processImage, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            });
        }
        // Cloudinary returns the full URL in req.file.path
        const imageUrl = req.file.path;
        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            success: false,
            message: "Error uploading image",
            error: error.message,
        });
    }
});
// Upload single blog image
router.post("/blog-image", upload_1.uploadBlogImage, upload_1.processImage, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            });
        }
        // Cloudinary returns the full URL in req.file.path
        const imageUrl = req.file.path;
        res.status(200).json({
            success: true,
            message: "Blog image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });
    }
    catch (error) {
        console.error("Blog upload error:", error);
        res.status(500).json({
            success: false,
            message: "Error uploading blog image",
            error: error.message,
        });
    }
});
// Upload single transfer image
router.post("/transfer-image", upload_1.uploadTransferImage, upload_1.processImage, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            });
        }
        // Cloudinary returns the full URL in req.file.path
        const imageUrl = req.file.path;
        res.status(200).json({
            success: true,
            message: "Transfer image uploaded successfully",
            data: {
                imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });
    }
    catch (error) {
        console.error("Transfer upload error:", error);
        res.status(500).json({
            success: false,
            message: "Error uploading transfer image",
            error: error.message,
        });
    }
});
// Delete image endpoint
router.delete("/tour-image", (req, res) => {
    try {
        const { imagePath } = req.body;
        if (!imagePath) {
            return res.status(400).json({
                success: false,
                message: "Image path is required",
            });
        }
        (0, upload_1.deleteOldImage)(imagePath);
        res.status(200).json({
            success: true,
            message: "Image deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting image",
            error: error.message,
        });
    }
});
exports.default = router;
