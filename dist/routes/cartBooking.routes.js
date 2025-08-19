"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartBooking_controller_1 = require("../controllers/cartBooking.controller");
const router = (0, express_1.Router)();
// POST /api/cart-booking - Book all items in cart
router.post('/', cartBooking_controller_1.cartBookingController.bookCartItems.bind(cartBooking_controller_1.cartBookingController));
// GET /api/cart-booking/summary/:userEmail - Get cart booking summary
router.get('/summary/:userEmail', cartBooking_controller_1.cartBookingController.getCartBookingSummary.bind(cartBooking_controller_1.cartBookingController));
exports.default = router;
