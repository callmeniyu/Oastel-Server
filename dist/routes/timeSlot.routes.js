"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const timeSlot_controller_1 = require("../controllers/timeSlot.controller");
const router = (0, express_1.Router)();
// Generate time slots for a package
router.post("/generate", timeSlot_controller_1.generateSlots);
// Check availability for a specific slot
router.get("/availability", timeSlot_controller_1.checkAvailability);
// Get available slots for a specific date
router.get("/available", timeSlot_controller_1.getAvailableSlots);
// Toggle slot availability (enable/disable specific time slot)
router.put("/toggle-availability", timeSlot_controller_1.toggleSlotAvailability);
// Get server's Malaysia timezone date and time
router.get("/server-datetime", timeSlot_controller_1.getServerDateTime);
// Debug: Get all time slots for a package
router.get("/debug", timeSlot_controller_1.debugTimeSlots);
// Update slot booking count
router.put("/booking", timeSlot_controller_1.updateSlotBooking);
// Update slots for a package (when package is modified)
router.put("/package", timeSlot_controller_1.updateSlotsForPackage);
// Get slots summary for admin dashboard
router.get("/summary", timeSlot_controller_1.getSlotsSummary);
// Delete all slots for a package
router.delete("/:packageType/:packageId", timeSlot_controller_1.deleteSlotsForPackage);
exports.default = router;
