"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementBlogViews = exports.deleteBlog = exports.updateBlog = exports.getBlogBySlug = exports.getBlogById = exports.getBlogs = exports.createBlog = void 0;
const Blog_1 = __importDefault(require("../models/Blog"));
const generateSlug_1 = require("../utils/generateSlug");
const createBlog = async (req, res) => {
    try {
        const blogData = req.body;
        // Generate slug if not provided
        if (!blogData.slug) {
            blogData.slug = (0, generateSlug_1.generateSlug)(blogData.title);
        }
        // Validate slug uniqueness
        const existingBlog = await Blog_1.default.findOne({ slug: blogData.slug });
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: "A blog with this slug already exists",
            });
        }
        // Validate required fields
        const requiredFields = ["title", "description", "category", "image", "content", "publishDate"];
        for (const field of requiredFields) {
            if (!blogData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`,
                });
            }
        }
        // Ensure views is a number
        if (!blogData.views) {
            blogData.views = 0;
        }
        const blog = new Blog_1.default(blogData);
        const savedBlog = await blog.save();
        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: savedBlog,
        });
    }
    catch (error) {
        console.error("Error creating blog:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createBlog = createBlog;
const getBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const category = req.query.category;
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder || "desc";
        const skip = (page - 1) * limit;
        const query = {};
        // Filter by category if provided
        if (category && category !== "all") {
            query.category = category;
        }
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;
        const blogs = await Blog_1.default.find(query).sort(sort).skip(skip).limit(limit);
        const total = await Blog_1.default.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: blogs,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
            },
        });
    }
    catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getBlogs = getBlogs;
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog_1.default.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }
        res.json({
            success: true,
            data: blog,
        });
    }
    catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getBlogById = getBlogById;
const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const blog = await Blog_1.default.findOne({ slug });
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }
        // Increment views
        blog.views += 1;
        await blog.save();
        res.json({
            success: true,
            data: blog,
        });
    }
    catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getBlogBySlug = getBlogBySlug;
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const blogData = req.body;
        // Check if blog exists
        const existingBlog = await Blog_1.default.findById(id);
        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }
        // Check slug uniqueness if slug is being updated
        if (blogData.slug && blogData.slug !== existingBlog.slug) {
            const duplicateBlog = await Blog_1.default.findOne({ slug: blogData.slug });
            if (duplicateBlog) {
                return res.status(400).json({
                    success: false,
                    message: "A blog with this slug already exists",
                });
            }
        }
        const updatedBlog = await Blog_1.default.findByIdAndUpdate(id, blogData, {
            new: true,
            runValidators: true,
        });
        res.json({
            success: true,
            message: "Blog updated successfully",
            data: updatedBlog,
        });
    }
    catch (error) {
        console.error("Error updating blog:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
        }
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateBlog = updateBlog;
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBlog = await Blog_1.default.findByIdAndDelete(id);
        if (!deletedBlog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }
        res.json({
            success: true,
            message: "Blog deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteBlog = deleteBlog;
const incrementBlogViews = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog_1.default.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }
        res.json({
            success: true,
            message: "Blog views updated",
            data: blog,
        });
    }
    catch (error) {
        console.error("Error updating blog views:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.incrementBlogViews = incrementBlogViews;
