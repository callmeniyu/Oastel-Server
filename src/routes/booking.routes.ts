import express from "express";
import BookingController from "../controllers/booking.controller";
import { getRevenueData } from "../controllers/revenue.controller";

const router = express.Router();

router.post("/", BookingController.createBooking);
router.get("/revenue", getRevenueData);
router.get("/user/:email", BookingController.getBookingsByUser);
router.get("/", BookingController.getBookings);
router.get("/:id", BookingController.getBookingById);
router.put("/:id", BookingController.updateBooking);
router.post("/:id/payment-confirm", BookingController.confirmPayment);
// Delete a booking
// `deleteBooking` was added to the controller; cast to any to avoid a transient TS error
router.delete("/:id", (BookingController as any).deleteBooking);

export default router;
