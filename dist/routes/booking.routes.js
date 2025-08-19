"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const booking_controller_1 = __importDefault(require("../controllers/booking.controller"));
const revenue_controller_1 = require("../controllers/revenue.controller");
const router = express_1.default.Router();
router.post("/", booking_controller_1.default.createBooking);
router.get("/revenue", revenue_controller_1.getRevenueData);
router.get("/user/:email", booking_controller_1.default.getBookingsByUser);
router.get("/", booking_controller_1.default.getBookings);
router.get("/:id", booking_controller_1.default.getBookingById);
router.put("/:id", booking_controller_1.default.updateBooking);
router.post("/:id/payment-confirm", booking_controller_1.default.confirmPayment);
exports.default = router;
