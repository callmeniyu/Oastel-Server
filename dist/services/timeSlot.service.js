"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeSlotService = void 0;
const TimeSlot_1 = __importDefault(require("../models/TimeSlot"));
const Tour_1 = __importDefault(require("../models/Tour"));
const Transfer_1 = __importDefault(require("../models/Transfer"));
class TimeSlotService {
    /**
     * Generate time slots for a package (tour or transfer) for the next 90 days
     * ROBUST IMPLEMENTATION: Always fetches package data to ensure correct minimumPerson
     */
    static async generateSlotsForPackage(packageType, packageId, departureTimes, capacity, minimumPerson // Optional - will fetch from package if not provided
    ) {
        try {
            // STEP 1: Always fetch package data to get correct minimumPerson
            let packageDoc = null;
            if (packageType === "tour") {
                packageDoc = await Tour_1.default.findById(packageId);
            }
            else {
                packageDoc = await Transfer_1.default.findById(packageId);
            }
            if (!packageDoc) {
                throw new Error(`Package ${packageType}/${packageId} not found`);
            }
            // Use package's minimumPerson value (override parameter if provided)
            const packageMinimumPerson = packageDoc.minimumPerson || 1;
            console.log(`🎯 SLOT GENERATION: ${packageType}/${packageId} - Using minimumPerson=${packageMinimumPerson} from package data`);
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 90); // 90 days ahead
            // Generate slots for each day
            const currentDate = new Date(startDate);
            const slotsToCreate = [];
            while (currentDate <= endDate) {
                const dateString = this.formatDateToMYT(currentDate);
                // Check if slots already exist for this date
                const existingSlot = await TimeSlot_1.default.findOne({
                    packageType,
                    packageId,
                    date: dateString
                });
                if (!existingSlot) {
                    // STEP 2: Create slots with package's minimumPerson value
                    console.log(`📅 Creating slots for ${dateString} with minimumPerson=${packageMinimumPerson}`);
                    const slots = departureTimes.map(time => {
                        const slot = {
                            time,
                            capacity,
                            bookedCount: 0,
                            isAvailable: true,
                            minimumPerson: packageMinimumPerson // ALWAYS use package value
                        };
                        console.log(`  ⏰ Slot ${time}: minimumPerson=${slot.minimumPerson}`);
                        return slot;
                    });
                    slotsToCreate.push({
                        packageType,
                        packageId,
                        date: dateString,
                        slots,
                        capacity // Add capacity at document level
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Bulk insert all slots
            if (slotsToCreate.length > 0) {
                await TimeSlot_1.default.insertMany(slotsToCreate);
                console.log(`Generated ${slotsToCreate.length} time slot records for ${packageType} ${packageId}`);
            }
        }
        catch (error) {
            console.error("Error generating time slots:", error);
            throw error;
        }
    }
    /**
     * Check availability for a specific package, date, and time
     */
    static async checkAvailability(packageType, packageId, date, time, requestedPersons) {
        try {
            // Check if booking is within 10 hours of departure time
            const isBookingAllowed = this.isBookingAllowed(date, time);
            if (!isBookingAllowed) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Booking closed - less than 10 hours before departure"
                };
            }
            // Get package details to check if it's private
            let packageDoc = null;
            if (packageType === "tour") {
                packageDoc = await Tour_1.default.findById(packageId);
            }
            else {
                packageDoc = await Transfer_1.default.findById(packageId);
            }
            if (!packageDoc) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Package not found"
                };
            }
            // Find the time slot
            const timeSlot = await TimeSlot_1.default.findOne({
                packageType,
                packageId,
                date
            });
            if (!timeSlot) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "No time slots available for this date"
                };
            }
            // Find the specific time slot
            const slot = timeSlot.slots.find(s => s.time === time);
            if (!slot) {
                return {
                    available: false,
                    availableSlots: 0,
                    reason: "Requested time slot not available"
                };
            }
            const availableSlots = slot.capacity - slot.bookedCount;
            // Check minimum person requirement based on package type
            const isPrivate = packageDoc.type === "private" || packageDoc.type === "Private";
            const isFirstBooking = slot.bookedCount === 0;
            let requiredMinimum;
            if (isPrivate) {
                // For private packages, always use the original minimum person requirement
                requiredMinimum = slot.minimumPerson;
            }
            else {
                // For non-private packages, use the actual minimumPerson field from database
                // (which gets updated to 1 after first booking in updateSlotBooking)
                requiredMinimum = slot.minimumPerson;
            }
            // Validate minimum person requirement
            if (requestedPersons < requiredMinimum) {
                const bookingType = isPrivate ? "private" : (isFirstBooking ? "first" : "subsequent");
                return {
                    available: false,
                    availableSlots,
                    reason: `Minimum ${requiredMinimum} person${requiredMinimum > 1 ? 's' : ''} required for this ${bookingType} booking`
                };
            }
            return {
                available: availableSlots >= requestedPersons,
                availableSlots,
                reason: availableSlots < requestedPersons ? "Not enough slots available" : undefined
            };
        }
        catch (error) {
            console.error("Error checking availability:", error);
            throw error;
        }
    }
    /**
     * Update slot booking count when a booking is made
     * ROBUST IMPLEMENTATION: Handles minimumPerson logic correctly
     */
    static async updateSlotBooking(packageType, packageId, date, time, personsCount, operation = "add") {
        try {
            // STEP 1: Get package details to check if it's private
            let packageDoc = null;
            if (packageType === "tour") {
                packageDoc = await Tour_1.default.findById(packageId);
            }
            else {
                packageDoc = await Transfer_1.default.findById(packageId);
            }
            if (!packageDoc) {
                throw new Error("Package not found");
            }
            const isPrivate = packageDoc.type === "private" || packageDoc.type === "Private";
            console.log(`🎯 BOOKING UPDATE: ${packageType}/${packageId} - isPrivate=${isPrivate}`);
            // STEP 2: Find the time slot
            const timeSlot = await TimeSlot_1.default.findOne({
                packageType,
                packageId,
                date
            });
            if (!timeSlot) {
                throw new Error("Time slot not found");
            }
            const slotIndex = timeSlot.slots.findIndex(s => s.time === time);
            if (slotIndex === -1) {
                throw new Error("Specific time slot not found");
            }
            // STEP 3: Get current state and log it
            const currentBookedCount = timeSlot.slots[slotIndex].bookedCount;
            const currentMinimumPerson = timeSlot.slots[slotIndex].minimumPerson;
            console.log(`� BEFORE UPDATE - Date: ${date}, Time: ${time}`);
            console.log(`   BookedCount: ${currentBookedCount}, MinimumPerson: ${currentMinimumPerson}`);
            // STEP 4: Calculate new booked count
            const newBookedCount = operation === "add"
                ? currentBookedCount + personsCount
                : Math.max(0, currentBookedCount - personsCount);
            // Ensure we don't exceed capacity
            if (newBookedCount > timeSlot.slots[slotIndex].capacity) {
                throw new Error("Booking would exceed slot capacity");
            }
            // STEP 5: CORE LOGIC - Update minimumPerson for first booking
            let newMinimumPerson = currentMinimumPerson;
            if (operation === "add" && currentBookedCount === 0 && newBookedCount > 0) {
                // This is the FIRST booking for this slot
                if (!isPrivate) {
                    // For NON-PRIVATE packages, set minimumPerson to 1 after first booking
                    newMinimumPerson = 1;
                    console.log(`🚀 FIRST BOOKING DETECTED! Non-private package - Setting minimumPerson from ${currentMinimumPerson} to 1`);
                }
                else {
                    // For PRIVATE packages, keep original minimumPerson
                    console.log(`🏠 FIRST BOOKING DETECTED! Private package - Keeping minimumPerson at ${currentMinimumPerson}`);
                }
            }
            else if (operation === "subtract" && newBookedCount === 0 && currentBookedCount > 0) {
                // All bookings cancelled - restore original minimumPerson from package
                const originalMinimumPerson = packageDoc.minimumPerson || 1;
                newMinimumPerson = originalMinimumPerson;
                console.log(`� ALL BOOKINGS CANCELLED! Restoring minimumPerson from ${currentMinimumPerson} to ${originalMinimumPerson}`);
            }
            // STEP 6: Update the slot
            timeSlot.slots[slotIndex].bookedCount = newBookedCount;
            timeSlot.slots[slotIndex].minimumPerson = newMinimumPerson;
            // STEP 7: Save and verify
            const savedTimeSlot = await timeSlot.save();
            console.log(`✅ AFTER UPDATE - BookedCount: ${newBookedCount}, MinimumPerson: ${newMinimumPerson}`);
            // STEP 8: Double-check by re-querying from database
            const verifyTimeSlot = await TimeSlot_1.default.findOne({
                packageType,
                packageId,
                date
            });
            if (verifyTimeSlot) {
                const verifySlot = verifyTimeSlot.slots[slotIndex];
                console.log(`🔍 DATABASE VERIFICATION - BookedCount: ${verifySlot.bookedCount}, MinimumPerson: ${verifySlot.minimumPerson}`);
                if (verifySlot.minimumPerson !== newMinimumPerson) {
                    console.error(`❌ VERIFICATION FAILED! Expected minimumPerson=${newMinimumPerson}, got ${verifySlot.minimumPerson}`);
                }
                else {
                    console.log(`✅ VERIFICATION SUCCESS! MinimumPerson correctly set to ${verifySlot.minimumPerson}`);
                }
            }
            else {
                console.log('⚠️ Database verification failed: TimeSlot not found');
            }
            return true;
        }
        catch (error) {
            console.error("Error updating slot booking:", error);
            throw error;
        }
    }
    /**
     * Get available slots for a specific date and package
     */
    static async getAvailableSlots(packageType, packageId, date) {
        try {
            // Get package details to check if it's private
            let packageDoc = null;
            if (packageType === "tour") {
                packageDoc = await Tour_1.default.findById(packageId);
            }
            else {
                packageDoc = await Transfer_1.default.findById(packageId);
            }
            if (!packageDoc) {
                return null;
            }
            const timeSlot = await TimeSlot_1.default.findOne({
                packageType,
                packageId,
                date
            });
            if (!timeSlot) {
                return null;
            }
            const isPrivate = packageDoc.type === "private" || packageDoc.type === "Private";
            const slotsWithAvailability = timeSlot.slots.map(slot => {
                // Calculate effective currentMinimum based on booking status
                // For non-private: minimumPerson is already correct (package min or 1 after first booking)
                // For private: always use package minimum regardless of booking status
                let currentMinimum = slot.minimumPerson;
                if (isPrivate) {
                    // For private tours, always enforce the original package minimum
                    currentMinimum = packageDoc.minimumPerson || slot.minimumPerson;
                }
                else {
                    // For non-private tours, use the slot's minimumPerson (which is already managed correctly)
                    currentMinimum = slot.minimumPerson;
                }
                console.log(`📋 Slot ${slot.time} - BookedCount: ${slot.bookedCount}, MinimumPerson: ${slot.minimumPerson}, CurrentMinimum: ${currentMinimum}, IsPrivate: ${isPrivate}`);
                return {
                    time: slot.time,
                    capacity: slot.capacity,
                    bookedCount: slot.bookedCount,
                    isAvailable: slot.isAvailable && this.isBookingAllowed(date, slot.time) && (slot.capacity - slot.bookedCount) > 0,
                    minimumPerson: slot.minimumPerson,
                    currentMinimum
                };
            });
            return slotsWithAvailability;
        }
        catch (error) {
            console.error("Error getting available slots:", error);
            throw error;
        }
    }
    /**
     * Check if booking is allowed (allow booking from the very next day with 10-hour cutoff)
     */
    static isBookingAllowed(date, time) {
        try {
            // Parse the date and time
            const [year, month, day] = date.split('-').map(Number);
            // Parse time - handle both 12-hour and 24-hour formats
            let hour24;
            let minutes;
            if (time.includes('AM') || time.includes('PM')) {
                // 12-hour format
                const [timeStr, period] = time.split(' ');
                const [hours, mins] = timeStr.split(':').map(Number);
                hour24 = hours;
                minutes = mins;
                if (period && period.toUpperCase() === 'PM' && hours !== 12) {
                    hour24 += 12;
                }
                else if (period && period.toUpperCase() === 'AM' && hours === 12) {
                    hour24 = 0;
                }
            }
            else {
                // 24-hour format (e.g., "08:00", "14:00")
                const [hours, mins] = time.split(':').map(Number);
                hour24 = hours;
                minutes = mins;
            }
            // Get current time in Malaysia timezone (UTC+8)
            const now = new Date();
            const malaysiaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
            // Create departure time by parsing the date and time in Malaysia context
            // Since we're dealing with Malaysia bookings, treat the input date/time as Malaysia time
            const departureMYT = new Date(year, month - 1, day, hour24, minutes, 0, 0);
            // Check if booking date is at least tomorrow (Malaysia time)
            const todayMYT = new Date(malaysiaNow.getFullYear(), malaysiaNow.getMonth(), malaysiaNow.getDate());
            const tomorrowMYT = new Date(todayMYT.getTime() + 24 * 60 * 60 * 1000);
            const bookingDateMYT = new Date(year, month - 1, day);
            if (bookingDateMYT.getTime() < tomorrowMYT.getTime()) {
                console.log(`Booking rejected - date ${date} is not at least tomorrow (MYT)`);
                return false;
            }
            // Calculate cutoff time (10 hours before departure)
            const cutoffMYT = new Date(departureMYT.getTime() - 10 * 60 * 60 * 1000);
            // Allow booking only if current Malaysia time is before the cutoff time
            const isAllowed = malaysiaNow.getTime() < cutoffMYT.getTime();
            console.log(`Booking time check for ${date} ${time}:`);
            console.log(`Current Malaysia Time: ${malaysiaNow.toISOString()} (${malaysiaNow.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })})`);
            console.log(`Departure Time: ${departureMYT.toISOString()} (${departureMYT.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })})`);
            console.log(`Cutoff Time: ${cutoffMYT.toISOString()} (${cutoffMYT.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })})`);
            console.log(`Time difference (hours): ${(departureMYT.getTime() - malaysiaNow.getTime()) / (1000 * 60 * 60)}`);
            console.log(`Booking Allowed: ${isAllowed}`);
            return isAllowed;
        }
        catch (error) {
            console.error("Error checking booking time:", error);
            return false;
        }
    }
    /**
     * Format date to Malaysia timezone string (YYYY-MM-DD)
     */
    static formatDateToMYT(date) {
        // Convert to Malaysia timezone (UTC+8)
        const malaysiaOffset = 8 * 60 * 60 * 1000;
        const malaysiaTime = new Date(date.getTime() + malaysiaOffset);
        return malaysiaTime.toISOString().split('T')[0];
    }
    /**
     * Get current Malaysia timezone date and time
     */
    static getMalaysiaDateTime() {
        const now = new Date();
        const malaysiaOffset = 8 * 60 * 60 * 1000;
        const malaysiaTime = new Date(now.getTime() + malaysiaOffset);
        return {
            date: malaysiaTime.toISOString().split('T')[0],
            time: malaysiaTime.toLocaleTimeString('en-US', {
                hour12: true,
                hour: 'numeric',
                minute: '2-digit'
            }),
            fullDateTime: malaysiaTime
        };
    }
    /**
     * Convert date string to Malaysia timezone format (YYYY-MM-DD)
     */
    static formatDateToMalaysiaTimezone(dateString) {
        const date = new Date(dateString + 'T00:00:00.000Z');
        const malaysiaOffset = 8 * 60 * 60 * 1000;
        const malaysiaTime = new Date(date.getTime() + malaysiaOffset);
        return malaysiaTime.toISOString().split('T')[0];
    }
    /**
     * Delete all slots for a package (when package is deleted)
     */
    static async deleteSlotsForPackage(packageType, packageId) {
        try {
            await TimeSlot_1.default.deleteMany({
                packageType,
                packageId
            });
            console.log(`Deleted all time slots for ${packageType} ${packageId}`);
        }
        catch (error) {
            console.error("Error deleting slots for package:", error);
            throw error;
        }
    }
    /**
     * Get slots summary for admin dashboard
     */
    static async getSlotsSummary(packageType, packageId, startDate, endDate) {
        try {
            const query = { packageType, packageId };
            if (startDate || endDate) {
                query.date = {};
                if (startDate)
                    query.date.$gte = startDate;
                if (endDate)
                    query.date.$lte = endDate;
            }
            const timeSlots = await TimeSlot_1.default.find(query).sort({ date: 1 });
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
            }));
        }
        catch (error) {
            console.error("Error getting slots summary:", error);
            throw error;
        }
    }
    /**
     * Update time slots for a package when admin changes departure times or capacity
     * This will regenerate slots for future dates while preserving existing bookings
     */
    static async updateSlotsForPackage(packageType, packageId, newTimes, newCapacity) {
        try {
            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            // Get package details to retrieve minimumPerson
            let packageDoc = null;
            if (packageType === "tour") {
                packageDoc = await Tour_1.default.findById(packageId);
            }
            else {
                packageDoc = await Transfer_1.default.findById(packageId);
            }
            if (!packageDoc) {
                throw new Error("Package not found");
            }
            // Get the package's minimumPerson value
            const packageMinimumPerson = packageDoc.minimumPerson || 1;
            console.log(`Using package minimumPerson: ${packageMinimumPerson} for ${packageType} ${packageId}`);
            // Find all existing time slots for this package from today onwards
            const existingSlots = await TimeSlot_1.default.find({
                packageType,
                packageId,
                date: { $gte: todayStr }
            });
            // For each existing slot, update the structure
            for (const slot of existingSlots) {
                const updatedSlots = newTimes.map(time => {
                    // Try to find existing slot data for this time
                    const existingSlot = slot.slots.find(s => s.time === time);
                    // For existing slots with bookings, keep their minimumPerson value
                    // For slots with no bookings or new slots, use the package's minimumPerson
                    const minimumPerson = existingSlot && existingSlot.bookedCount > 0
                        ? Math.min(existingSlot.minimumPerson, 1) // If it has bookings, it should be 1 
                        : packageMinimumPerson; // Otherwise use package default
                    return {
                        time,
                        capacity: newCapacity,
                        bookedCount: existingSlot ? Math.min(existingSlot.bookedCount, newCapacity) : 0,
                        isAvailable: true,
                        minimumPerson: minimumPerson // Use correct minimum person
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
                const existingSlot = await TimeSlot_1.default.findOne({
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
                        isAvailable: true,
                        minimumPerson: 1 // or fetch from package if available
                    }));
                    await TimeSlot_1.default.create({
                        packageType,
                        packageId,
                        date: dateStr,
                        slots
                    });
                }
            }
            return true;
        }
        catch (error) {
            console.error("Error updating slots for package:", error);
            throw error;
        }
    }
    /**
     * Toggle availability of a specific slot
     */
    static async toggleSlotAvailability(packageType, packageId, date, time, isAvailable) {
        try {
            const timeSlot = await TimeSlot_1.default.findOne({
                packageType,
                packageId,
                date
            });
            if (!timeSlot) {
                throw new Error("Time slot not found");
            }
            const slotIndex = timeSlot.slots.findIndex(s => s.time === time);
            if (slotIndex === -1) {
                throw new Error("Specific time slot not found");
            }
            // Update the isAvailable property
            timeSlot.slots[slotIndex].isAvailable = isAvailable;
            await timeSlot.save();
            console.log(`Slot ${packageType}:${packageId} on ${date} at ${time} set to ${isAvailable ? 'available' : 'unavailable'}`);
            return true;
        }
        catch (error) {
            console.error("Error toggling slot availability:", error);
            throw error;
        }
    }
}
exports.TimeSlotService = TimeSlotService;
