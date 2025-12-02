import { Router } from "express"
import {
    createTour,
    getTours,
    getTourById,
    getTourBySlug,
    updateTour,
    updateTourStatus,
    deleteTour,
    checkSlugAvailability,
    toggleTourAvailability,
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

// Update tour status (partial update)
router.patch("/:id", updateTourStatus)

// Toggle tour availability (enable/disable booking)
router.patch("/:id/availability", toggleTourAvailability)

// Delete tour
router.delete("/:id", deleteTour)

export default router
