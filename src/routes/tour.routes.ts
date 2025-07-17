import { Router } from "express"
import {
    createTour,
    getTours,
    getTourById,
    getTourBySlug,
    updateTour,
    deleteTour,
    checkSlugAvailability,
} from "../controllers/tour.controller"

const router = Router()

// Create a new tour
router.post("/", createTour)

// Get all tours with pagination and filtering
router.get("/", getTours)

// Check slug availability
router.get("/check-slug/:slug", checkSlugAvailability)

// Get tour by slug
router.get("/slug/:slug", getTourBySlug)

// Get tour by ID
router.get("/:id", getTourById)

// Update tour
router.put("/:id", updateTour)

// Delete tour
router.delete("/:id", deleteTour)

export default router
