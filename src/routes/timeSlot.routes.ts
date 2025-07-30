import { Router } from "express"
import {
    generateSlots,
    checkAvailability,
    getAvailableSlots,
    updateSlotBooking,
    updateSlotsForPackage,
    getSlotsSummary,
    deleteSlotsForPackage,
    debugTimeSlots,
    getServerDateTime
} from "../controllers/timeSlot.controller"

const router = Router()

// Generate time slots for a package
router.post("/generate", generateSlots)

// Check availability for a specific slot
router.get("/availability", checkAvailability)

// Get available slots for a specific date
router.get("/available", getAvailableSlots)

// Get server's Malaysia timezone date and time
router.get("/server-datetime", getServerDateTime)

// Debug: Get all time slots for a package
router.get("/debug", debugTimeSlots)

// Update slot booking count
router.put("/booking", updateSlotBooking)

// Update slots for a package (when package is modified)
router.put("/package", updateSlotsForPackage)

// Get slots summary for admin dashboard
router.get("/summary", getSlotsSummary)

// Delete all slots for a package
router.delete("/:packageType/:packageId", deleteSlotsForPackage)

export default router
