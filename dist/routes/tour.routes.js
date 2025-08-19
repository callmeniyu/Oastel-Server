"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tour_controller_1 = require("../controllers/tour.controller");
const router = (0, express_1.Router)();
// Create a new tour
router.post("/", tour_controller_1.createTour);
// Get all tours with pagination and filtering
router.get("/", tour_controller_1.getTours);
// Check slug availability
router.get("/check-slug/:slug", tour_controller_1.checkSlugAvailability);
// Get tour by slug
router.get("/slug/:slug", tour_controller_1.getTourBySlug);
// Get tour by ID
router.get("/:id", tour_controller_1.getTourById);
// Update tour
router.put("/:id", tour_controller_1.updateTour);
// Update tour status (partial update)
router.patch("/:id", tour_controller_1.updateTourStatus);
// Delete tour
router.delete("/:id", tour_controller_1.deleteTour);
exports.default = router;
