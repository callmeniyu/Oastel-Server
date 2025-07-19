import { Request, Response } from "express"
import Blog, { BlogType } from "../models/Blog"
import { generateSlug } from "../utils/generateSlug"

export const createBlog = async (req: Request, res: Response) => {
    try {
        const blogData = req.body

        // Generate slug if not provided
        if (!blogData.slug) {
            blogData.slug = generateSlug(blogData.title)
        }

        // Validate slug uniqueness
        const existingBlog = await Blog.findOne({ slug: blogData.slug })
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: "A blog with this slug already exists",
            })
        }

        // Validate required fields
        const requiredFields = ["title", "description", "category", "image", "content", "publishDate"]
        for (const field of requiredFields) {
            if (!blogData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`,
                })
            }
        }

        // Ensure views is a number
        if (!blogData.views) {
            blogData.views = 0
        }

        const blog = new Blog(blogData)
        const savedBlog = await blog.save()

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: savedBlog,
        })
    } catch (error: any) {
        console.error("Error creating blog:", error)

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getBlogs = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const category = req.query.category as string
        const sortBy = (req.query.sortBy as string) || "createdAt"
        const sortOrder = (req.query.sortOrder as string) || "desc"

        const skip = (page - 1) * limit
        const query: any = {}

        // Filter by category if provided
        if (category && category !== "all") {
            query.category = category
        }

        // Build sort object
        const sort: any = {}
        sort[sortBy] = sortOrder === "desc" ? -1 : 1

        const blogs = await Blog.find(query).sort(sort).skip(skip).limit(limit)

        const total = await Blog.countDocuments(query)
        const totalPages = Math.ceil(total / limit)

        res.json({
            success: true,
            data: blogs,
            pagination: {
                page,
                limit,
                total,
                pages: totalPages,
            },
        })
    } catch (error) {
        console.error("Error fetching blogs:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getBlogById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const blog = await Blog.findById(id)

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            })
        }

        res.json({
            success: true,
            data: blog,
        })
    } catch (error) {
        console.error("Error fetching blog:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const getBlogBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params
        const blog = await Blog.findOne({ slug })

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            })
        }

        // Increment views
        blog.views += 1
        await blog.save()

        res.json({
            success: true,
            data: blog,
        })
    } catch (error) {
        console.error("Error fetching blog:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const updateBlog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const blogData = req.body

        // Check if blog exists
        const existingBlog = await Blog.findById(id)
        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            })
        }

        // Check slug uniqueness if slug is being updated
        if (blogData.slug && blogData.slug !== existingBlog.slug) {
            const duplicateBlog = await Blog.findOne({ slug: blogData.slug })
            if (duplicateBlog) {
                return res.status(400).json({
                    success: false,
                    message: "A blog with this slug already exists",
                })
            }
        }

        const updatedBlog = await Blog.findByIdAndUpdate(id, blogData, {
            new: true,
            runValidators: true,
        })

        res.json({
            success: true,
            message: "Blog updated successfully",
            data: updatedBlog,
        })
    } catch (error: any) {
        console.error("Error updating blog:", error)

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const deleteBlog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const deletedBlog = await Blog.findByIdAndDelete(id)

        if (!deletedBlog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            })
        }

        res.json({
            success: true,
            message: "Blog deleted successfully",
        })
    } catch (error) {
        console.error("Error deleting blog:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}

export const incrementBlogViews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const blog = await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            })
        }

        res.json({
            success: true,
            message: "Blog views updated",
            data: blog,
        })
    } catch (error) {
        console.error("Error updating blog views:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
