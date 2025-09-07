import { Router } from 'express';
import { PaymentDebugController } from '../controllers/paymentDebug.controller';

const router = Router();

// Debug payment intent and check booking status
router.get('/debug/:paymentIntentId', PaymentDebugController.debugPayment);

// Retry booking creation for successful payment
router.post('/retry/:paymentIntentId', PaymentDebugController.retryBookingCreation);

export default router;
