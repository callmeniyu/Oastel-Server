import express from 'express';
import { stripeWebhook } from '../controllers/stripeWebhook.controller';

const router = express.Router();

// Stripe webhook expects raw body; the app will mount this route using express.raw middleware
router.post('/stripe', stripeWebhook);

export default router;
