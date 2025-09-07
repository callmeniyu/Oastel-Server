import { Request, Response } from 'express';
import { RollingTimeslotService } from '../services/rollingTimeslot.service';
import { TimeslotScheduler } from '../jobs/timeslotScheduler';

/**
 * Manual trigger for rolling timeslot generation
 */
export const generateRollingTimeslots = async (req: Request, res: Response) => {
    try {
        console.log('🚀 Manual rolling timeslot generation triggered');
        
        const result = await RollingTimeslotService.generateRollingTimeslots();
        
        res.json({
            success: result.success,
            message: result.success 
                ? 'Rolling timeslot generation completed successfully'
                : 'Rolling timeslot generation completed with errors',
            data: {
                packagesProcessed: result.packagesProcessed,
                slotsGenerated: result.slotsGenerated,
                errors: result.errors
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error in manual rolling timeslot generation:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during timeslot generation',
            error: error.message
        });
    }
};

/**
 * Generate slots for a specific package (for testing)
 */
export const generateSlotsForPackage = async (req: Request, res: Response) => {
    try {
        const { packageType, packageId } = req.params;
        
        if (!['tour', 'transfer'].includes(packageType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packageType. Must be "tour" or "transfer"'
            });
        }
        
        if (!packageId) {
            return res.status(400).json({
                success: false,
                message: 'Package ID is required'
            });
        }
        
        console.log(`🎯 Generating slots for ${packageType} ${packageId}`);
        
        const result = await RollingTimeslotService.generateSlotsForSpecificPackage(
            packageType as 'tour' | 'transfer',
            packageId
        );
        
        res.json({
            success: result.success,
            message: result.message,
            data: {
                slotsGenerated: result.slotsGenerated
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error generating slots for package:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Check which packages need slot generation
 */
export const checkPackagesNeedingSlots = async (req: Request, res: Response) => {
    try {
        const result = await RollingTimeslotService.checkPackagesNeedingSlots();
        
        res.json({
            success: true,
            data: {
                tours: result.tours.map(tour => ({
                    _id: tour._id,
                    title: tour.title,
                    lastSlotsGeneratedAt: tour.lastSlotsGeneratedAt,
                    createdAt: tour.createdAt
                })),
                transfers: result.transfers.map(transfer => ({
                    _id: transfer._id,
                    title: transfer.title,
                    lastSlotsGeneratedAt: transfer.lastSlotsGeneratedAt,
                    createdAt: transfer.createdAt
                })),
                summary: {
                    toursNeedingSlots: result.tours.length,
                    transfersNeedingSlots: result.transfers.length,
                    totalPackagesNeedingSlots: result.tours.length + result.transfers.length
                }
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error checking packages needing slots:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = async (req: Request, res: Response) => {
    try {
        const status = TimeslotScheduler.getStatus();
        
        res.json({
            success: true,
            data: {
                scheduler: status,
                currentTime: new Date().toISOString(),
                timezone: 'Asia/Kuala_Lumpur'
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error getting scheduler status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Run timeslot generation immediately (for testing)
 */
export const runTimeslotGenerationNow = async (req: Request, res: Response) => {
    try {
        // Run the generation in the background
        TimeslotScheduler.runNow().catch(error => {
            console.error('❌ Background timeslot generation error:', error);
        });
        
        res.json({
            success: true,
            message: 'Timeslot generation started in the background. Check logs for progress.',
            data: {
                startedAt: new Date().toISOString()
            }
        });
        
    } catch (error: any) {
        console.error('❌ Error starting timeslot generation:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
