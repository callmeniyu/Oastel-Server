import { Router } from 'express';
import {
    generateRollingTimeslots,
    generateSlotsForPackage,
    checkPackagesNeedingSlots,
    getSchedulerStatus,
    runTimeslotGenerationNow
} from '../controllers/rollingTimeslot.controller';

const router = Router();

/**
 * @route   POST /api/rolling-timeslots/generate
 * @desc    Manually trigger rolling timeslot generation for all packages
 * @access  Admin only (should be protected in production)
 */
router.post('/generate', generateRollingTimeslots);

/**
 * @route   POST /api/rolling-timeslots/generate/:packageType/:packageId
 * @desc    Generate slots for a specific package
 * @access  Admin only
 */
router.post('/generate/:packageType/:packageId', generateSlotsForPackage);

/**
 * @route   GET /api/rolling-timeslots/check
 * @desc    Check which packages need slot generation
 * @access  Admin only
 */
router.get('/check', checkPackagesNeedingSlots);

/**
 * @route   GET /api/rolling-timeslots/status
 * @desc    Get scheduler status
 * @access  Admin only
 */
router.get('/status', getSchedulerStatus);

/**
 * @route   POST /api/rolling-timeslots/run-now
 * @desc    Run timeslot generation immediately
 * @access  Admin only
 */
router.post('/run-now', runTimeslotGenerationNow);

export default router;
