import { Router } from "express"
import {
    createBlog,
    getBlogs,
    getBlogById,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
    incrementBlogViews,
    setBlogFeature,
} from "../controllers/blog.controller"

const router = Router()

// Create a new blog
router.post("/", createBlog)

// Get all blogs with pagination and filters
router.get("/", getBlogs)

// Get blog by ID
router.get("/:id", getBlogById)

// Get blog by slug (for public viewing)
router.get("/slug/:slug", getBlogBySlug)

// Update blog
router.put("/:id", updateBlog)

// Set featured rank
router.patch("/:id/feature", setBlogFeature)

// Delete blog
router.delete("/:id", deleteBlog)

// Increment blog views
router.patch("/:id/views", incrementBlogViews)

export default router
