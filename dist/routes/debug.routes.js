"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const debug_controller_1 = require("../controllers/debug.controller");
const debugRouter = (0, express_1.Router)();
// GET /api/debug/tours - Get all tours with time slot counts
debugRouter.get("/tours", debug_controller_1.debugTours);
// GET /api/debug/test-review-email - Test review email functionality
debugRouter.get("/test-review-email", debug_controller_1.testReviewEmail);
// GET /api/debug/test-review-scheduler - Test review scheduler for recent bookings
debugRouter.get("/test-review-scheduler", debug_controller_1.testReviewScheduler);
// GET /api/debug/preview-review-email - Preview review email template
debugRouter.get("/preview-review-email", debug_controller_1.previewReviewEmail);
exports.default = debugRouter;
