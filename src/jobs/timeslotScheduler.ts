import * as cron from 'node-cron';
import { RollingTimeslotService } from '../services/rollingTimeslot.service';

/**
 * Scheduled job to maintain rolling 90-day timeslot window
 * Runs daily at 2:00 AM to generate new slots and maintain the rolling window
 */
export class TimeslotScheduler {
    
    private static isRunning = false;
    private static cronJob: cron.ScheduledTask | null = null;

    /**
     * Start the scheduled job
     */
    static start(): void {
        if (this.cronJob) {
            console.log('⚠️ Timeslot scheduler already running');
            return;
        }

        // Schedule to run daily at 2:00 AM
        this.cronJob = cron.schedule('0 2 * * *', async () => {
            if (this.isRunning) {
                console.log('⚠️ Timeslot generation already running, skipping...');
                return;
            }

            this.isRunning = true;
            console.log('🕐 Starting scheduled timeslot generation at', new Date().toISOString());

            try {
                const result = await RollingTimeslotService.generateRollingTimeslots();
                
                if (result.success) {
                    console.log(`✅ Scheduled timeslot generation completed successfully:`);
                    console.log(`   - Packages processed: ${result.packagesProcessed}`);
                    console.log(`   - Slots generated: ${result.slotsGenerated}`);
                } else {
                    console.error(`❌ Scheduled timeslot generation completed with errors:`);
                    console.error(`   - Packages processed: ${result.packagesProcessed}`);
                    console.error(`   - Slots generated: ${result.slotsGenerated}`);
                    console.error(`   - Errors: ${result.errors.length}`);
                    result.errors.forEach(error => console.error(`     ${error}`));
                }

            } catch (error: any) {
                console.error('❌ Critical error in scheduled timeslot generation:', error);
            } finally {
                this.isRunning = false;
                console.log('🕐 Scheduled timeslot generation finished at', new Date().toISOString());
            }
        }, {
            timezone: 'Asia/Kuala_Lumpur' // Run in Malaysia timezone
        });

        console.log('✅ Timeslot scheduler started - will run daily at 2:00 AM MYT');
    }

    /**
     * Stop the scheduled job
     */
    static stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('🛑 Timeslot scheduler stopped');
        } else {
            console.log('⚠️ Timeslot scheduler was not running');
        }
    }

    /**
     * Run the timeslot generation immediately (for testing)
     */
    static async runNow(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ Timeslot generation already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Running timeslot generation manually...');

        try {
            const result = await RollingTimeslotService.generateRollingTimeslots();
            
            if (result.success) {
                console.log(`✅ Manual timeslot generation completed successfully:`);
                console.log(`   - Packages processed: ${result.packagesProcessed}`);
                console.log(`   - Slots generated: ${result.slotsGenerated}`);
            } else {
                console.error(`❌ Manual timeslot generation completed with errors:`);
                console.error(`   - Packages processed: ${result.packagesProcessed}`);
                console.error(`   - Slots generated: ${result.slotsGenerated}`);
                console.error(`   - Errors: ${result.errors.length}`);
                result.errors.forEach(error => console.error(`     ${error}`));
            }

        } catch (error: any) {
            console.error('❌ Critical error in manual timeslot generation:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get scheduler status
     */
    static getStatus(): { running: boolean; scheduled: boolean; nextRun?: string } {
        return {
            running: this.isRunning,
            scheduled: this.cronJob !== null,
            nextRun: this.cronJob ? 'Daily at 2:00 AM MYT' : undefined
        };
    }
}
