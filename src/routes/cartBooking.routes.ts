import { Router } from 'express';
import { cartBookingController } from '../controllers/cartBooking.controller';

const router = Router();

// POST /api/cart-booking - Book all items in cart
router.post('/', cartBookingController.bookCartItems.bind(cartBookingController));

// GET /api/cart-booking/summary/:userEmail - Get cart booking summary
router.get('/summary/:userEmail', cartBookingController.getCartBookingSummary.bind(cartBookingController));

export default router;
