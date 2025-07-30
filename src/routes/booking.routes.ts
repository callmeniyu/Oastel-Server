import express from "express";
import BookingController from "../controllers/booking.controller";
import { getRevenueData } from "../controllers/revenue.controller";

const router = express.Router();

router.post("/", BookingController.createBooking);
router.get("/revenue", getRevenueData);
router.get("/", BookingController.getBookings);
router.get("/:id", BookingController.getBookingById);
router.put("/:id", BookingController.updateBooking);
router.post("/:id/payment-confirm", BookingController.confirmPayment);

export default router;
