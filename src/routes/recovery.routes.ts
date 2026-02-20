import { Router } from 'express';
import { PaymentRecoveryService } from '../services/paymentRecovery.service';

const router = Router();

/**
 * Payment Recovery Routes
 * These endpoints help administrators recover from payment-booking mismatch scenarios
 */

// Scan for orphaned payments (successful payments with no bookings)
// GET /api/recovery/scan?hours=24&limit=50
router.get('/scan', PaymentRecoveryService.scanOrphanedPayments);

// Recover a specific payment by creating booking from payment intent
// POST /api/recovery/recover-payment
// Body: { paymentIntentId: "pi_xxx" }
router.post('/recover-payment', PaymentRecoveryService.recoverPayment);

// Get detailed information about a payment and its booking status
// GET /api/recovery/payment/:paymentIntentId
router.get('/payment/:paymentIntentId', PaymentRecoveryService.getPaymentDetails);

// Batch recover multiple payments at once
// POST /api/recovery/batch-recover
// Body: { paymentIntentIds: ["pi_xxx", "pi_yyy"] }
router.post('/batch-recover', PaymentRecoveryService.batchRecover);

export default router;
