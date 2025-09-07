import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();

// Create payment intent for single booking
router.post('/create-payment-intent', PaymentController.createPaymentIntent);

// Create payment intent for cart booking
router.post('/create-cart-payment-intent', PaymentController.createCartPaymentIntent);

// Confirm payment and create booking
router.post('/confirm-payment', PaymentController.confirmPayment);

// Get payment status
router.get('/status/:paymentIntentId', PaymentController.getPaymentStatus);

// Stripe webhook endpoint
router.post('/webhook', PaymentController.handleWebhook);

export default router;
