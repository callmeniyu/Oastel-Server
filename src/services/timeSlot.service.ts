import TimeSlot, { TimeSlotType, Slot } from "../models/TimeSlot"
import Tour from "../models/Tour"
import Transfer from "../models/Transfer"
import { Types } from "mongoose"

export class TimeSlotService {
    /**
     * Generate time slots for a package (tour or transfer) for the next 90 days
     */
    static async generateSlotsForPackage(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        departureTimes: string[],
        capacity: number
    ): Promise<void> {
        try {
            const startDate = new Date()
            const endDate = new Date()
            endDate.setDate(startDate.getDate() + 90) // 90 days ahead

            // Generate slots for each day
            const currentDate = new Date(startDate)
            const slotsToCreate: any[] = []

            while (currentDate <= endDate) {
                const dateString = this.formatDateToMYT(currentDate)
                
                // Check if slots already exist for this date
                const existingSlot = await TimeSlot.findOne({
                    packageType,
                    packageId,
                    date: dateString
                })

                if (!existingSlot) {
                    // Create slots for each departure time
                    const slots: Slot[] = departureTimes.map(time => ({
                        time,
                        capacity,
                        bookedCount: 0,
                        isAvailable: true // add isAvailable property
                    }))

                    slotsToCreate.push({
                        packageType,
                        packageId,
                        date: dateString,
                        slots,
                        capacity // Add capacity at document level
                    })
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }

            // Bulk insert all slots
            if (slotsToCreate.length > 0) {
                await TimeSlot.insertMany(slotsToCreate)
                console.log(`Generated ${slotsToCreate.length} time slot records for ${packageType} ${packageId}`)
            }
        } catch (error) {
            console.error("Error generating time slots:", error)
            throw error
        }
    }

    /**
     * Check availability for a specific package, date, and time
     */
    static async checkAvailability(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        date: string,
        time: string,
        requestedPersons: number
    ): Promise<{
        available: boolean
        availableSlots: number
        reason?: string
    }> {
        try {
            // Check if this date is a blackout date for this package type
            const BlackoutDate = (await import("../models/BlackoutDate")).default
            const isBlackoutDate = await BlackoutDate.findOne({
                date: new Date(date + 'T00:00:00.000Z'),
                packageType
            })

            console.log(`Checking availability for ${packageType} on ${date}:`, !!isBlackoutDate ? 'BLACKOUT' : 'AVAILABLE')

            if (isBlackoutDate) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Selected date is not available due to blackout restrictions"
                }
            }

            // Check if booking is within 10 hours of departure time
            const isBookingAllowed = this.isBookingAllowed(date, time)
            if (!isBookingAllowed) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Booking closed - less than 10 hours before departure"
                }
            }

            // Find the time slot
            const timeSlot = await TimeSlot.findOne({
                packageType,
                packageId,
                date
            })

            if (!timeSlot) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "No time slots available for this date"
                }
            }

            // Find the specific time slot
            const slot = timeSlot.slots.find(s => s.time === time)
            if (!slot) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Requested time slot not available"
                }
            }

            const availableSlots = slot.capacity - slot.bookedCount
            
            return {
                available: availableSlots >= requestedPersons,
                availableSlots,
                reason: availableSlots < requestedPersons ? "Not enough slots available" : undefined
            }
        } catch (error) {
            console.error("Error checking availability:", error)
            throw error
        }
    }

    /**
     * Update slot booking count when a booking is made
     */
    static async updateSlotBooking(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        date: string,
        time: string,
        personsCount: number,
        operation: "add" | "subtract" = "add"
    ): Promise<boolean> {
        try {
            const timeSlot = await TimeSlot.findOne({
                packageType,
                packageId,
                date
            })

            if (!timeSlot) {
                throw new Error("Time slot not found")
            }

            const slotIndex = timeSlot.slots.findIndex(s => s.time === time)
            if (slotIndex === -1) {
                throw new Error("Specific time slot not found")
            }

            // Update booked count
            const currentBookedCount = timeSlot.slots[slotIndex].bookedCount
            const newBookedCount = operation === "add" 
                ? currentBookedCount + personsCount 
                : Math.max(0, currentBookedCount - personsCount)

            // Ensure we don't exceed capacity
            if (newBookedCount > timeSlot.slots[slotIndex].capacity) {
                throw new Error("Booking would exceed slot capacity")
            }

            timeSlot.slots[slotIndex].bookedCount = newBookedCount
            await timeSlot.save()

            return true
        } catch (error) {
            console.error("Error updating slot booking:", error)
            throw error
        }
    }

    /**
     * Get available slots for a specific date and package
     */
    static async getAvailableSlots(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        date: string
    ): Promise<Array<{
        time: string
        capacity: number
        bookedCount: number
        isAvailable: boolean
    }> | null> {
        try {
            const timeSlot = await TimeSlot.findOne({
                packageType,
                packageId,
                date
            })

            if (!timeSlot) {
                return null
            }

            // Check if this date is a blackout date for this package type
            const BlackoutDate = (await import("../models/BlackoutDate")).default
            const isBlackoutDate = await BlackoutDate.findOne({
                date: new Date(date + 'T00:00:00.000Z'),
                packageType
            })

            console.log(`Checking blackout for ${packageType} on ${date}:`, !!isBlackoutDate)

            const slotsWithAvailability = timeSlot.slots.map(slot => ({
                time: slot.time,
                capacity: slot.capacity,
                bookedCount: slot.bookedCount,
                isAvailable: !isBlackoutDate && this.isBookingAllowed(date, slot.time) && (slot.capacity - slot.bookedCount) > 0
            }))

            return slotsWithAvailability
        } catch (error) {
            console.error("Error getting available slots:", error)
            throw error
        }
    }


    /**
     * Check if booking is allowed (allow booking from the very next day)
     */
    private static isBookingAllowed(date: string, time: string): boolean {
        try {
            // Parse the date and time in Malaysia timezone
            const [year, month, day] = date.split('-').map(Number)
            const [timeStr, period] = time.split(' ')
            const [hours, minutes] = timeStr.split(':').map(Number)
            
            let hour24 = hours
            if (period === 'PM' && hours !== 12) {
                hour24 += 12
            } else if (period === 'AM' && hours === 12) {
                hour24 = 0
            }

            // Create departure datetime in Malaysia timezone (UTC+8)
            const departureTime = new Date(year, month - 1, day, hour24, minutes)
            
            // Get current time in Malaysia timezone
            const now = new Date()
            const malaysiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)) // UTC+8

            // Allow booking if the departure time is in the future (even if less than 10 hours)
            // This allows booking from the very next day
            return departureTime.getTime() > malaysiaTime.getTime()
        } catch (error) {
            console.error("Error checking booking time:", error)
            return false
        }
    }

    /**
     * Format date to Malaysia timezone string (YYYY-MM-DD)
     */
    private static formatDateToMYT(date: Date): string {
        // Convert to Malaysia timezone (UTC+8)
        const malaysiaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000))
        return malaysiaTime.toISOString().split('T')[0]
    }

    /**
     * Get current Malaysia timezone date and time
     */
    static getMalaysiaDateTime(): { date: string; time: string; fullDateTime: Date } {
        const now = new Date()
        const malaysiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
        
        return {
            date: malaysiaTime.toISOString().split('T')[0],
            time: malaysiaTime.toLocaleTimeString('en-US', { 
                hour12: true, 
                hour: 'numeric', 
                minute: '2-digit',
                timeZone: 'Asia/Kuala_lumpur'
            }),
            fullDateTime: malaysiaTime
        }
    }

    /**
     * Convert date string to Malaysia timezone format (YYYY-MM-DD)
     */
    static formatDateToMalaysiaTimezone(dateString: string): string {
        const date = new Date(dateString + 'T00:00:00.000Z')
        const malaysiaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000))
        return malaysiaTime.toISOString().split('T')[0]
    }

    /**
     * Delete all slots for a package (when package is deleted)
     */
    static async deleteSlotsForPackage(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId
    ): Promise<void> {
        try {
            await TimeSlot.deleteMany({
                packageType,
                packageId
            })
            console.log(`Deleted all time slots for ${packageType} ${packageId}`)
        } catch (error) {
            console.error("Error deleting slots for package:", error)
            throw error
        }
    }

    /**
     * Get slots summary for admin dashboard
     */
    static async getSlotsSummary(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        startDate?: string,
        endDate?: string
    ): Promise<Array<{
        date: string
        totalCapacity: number
        totalBooked: number
        availableSlots: number
        slots: Array<{
            time: string
            capacity: number
            bookedCount: number
        }>
    }>> {
        try {
            const query: any = { packageType, packageId }
            
            if (startDate || endDate) {
                query.date = {}
                if (startDate) query.date.$gte = startDate
                if (endDate) query.date.$lte = endDate
            }

            const timeSlots = await TimeSlot.find(query).sort({ date: 1 })

            return timeSlots.map(slot => ({
                date: slot.date,
                totalCapacity: slot.slots.reduce((sum, s) => sum + s.capacity, 0),
                totalBooked: slot.slots.reduce((sum, s) => sum + s.bookedCount, 0),
                availableSlots: slot.slots.reduce((sum, s) => sum + (s.capacity - s.bookedCount), 0),
                slots: slot.slots.map(s => ({
                    time: s.time,
                    capacity: s.capacity,
                    bookedCount: s.bookedCount
                }))
            }))
        } catch (error) {
            console.error("Error getting slots summary:", error)
            throw error
        }
    }

    /**
     * Update time slots for a package when admin changes departure times or capacity
     * This will regenerate slots for future dates while preserving existing bookings
     */
    static async updateSlotsForPackage(
        packageType: "tour" | "transfer",
        packageId: Types.ObjectId,
        newTimes: string[],
        newCapacity: number
    ): Promise<boolean> {
        try {
            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Find all existing time slots for this package from today onwards
            const existingSlots = await TimeSlot.find({
                packageType,
                packageId,
                date: { $gte: todayStr }
            });

            // For each existing slot, update the structure
            for (const slot of existingSlots) {
                const updatedSlots = newTimes.map(time => {
                    // Try to find existing slot data for this time
                    const existingSlot = slot.slots.find(s => s.time === time);
                    
                    return {
                        time,
                        capacity: newCapacity,
                        bookedCount: existingSlot ? Math.min(existingSlot.bookedCount, newCapacity) : 0,
                        isAvailable: true
                    };
                });

                // Update the slot
                slot.slots = updatedSlots;
                await slot.save();
            }

            // Generate slots for the next 90 days if they don't exist
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 90);

            for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                
                // Check if slot already exists for this date
                const existingSlot = await TimeSlot.findOne({
                    packageType,
                    packageId,
                    date: dateStr
                });

                if (!existingSlot) {
                    // Create new slot
                    const slots = newTimes.map(time => ({
                        time,
                        capacity: newCapacity,
                        bookedCount: 0,
                        isAvailable: true
                    }));

                    await TimeSlot.create({
                        packageType,
                        packageId,
                        date: dateStr,
                        slots
                    });
                }
            }

            return true;
        } catch (error) {
            console.error("Error updating slots for package:", error);
            throw error;
        }
    }
}
