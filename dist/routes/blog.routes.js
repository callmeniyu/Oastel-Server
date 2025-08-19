"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blog_controller_1 = require("../controllers/blog.controller");
const router = (0, express_1.Router)();
// Create a new blog
router.post("/", blog_controller_1.createBlog);
// Get all blogs with pagination and filters
router.get("/", blog_controller_1.getBlogs);
// Get blog by ID
router.get("/:id", blog_controller_1.getBlogById);
// Get blog by slug (for public viewing)
router.get("/slug/:slug", blog_controller_1.getBlogBySlug);
// Update blog
router.put("/:id", blog_controller_1.updateBlog);
// Delete blog
router.delete("/:id", blog_controller_1.deleteBlog);
// Increment blog views
router.patch("/:id/views", blog_controller_1.incrementBlogViews);
exports.default = router;
