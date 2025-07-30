import { Request, Response } from "express"
import { Types } from "mongoose"

/**
 * Debug: Get all tours with their time slot counts
 */
export const debugTours = async (req: Request, res: Response) => {
    try {
        // Import models
        const Tour = (await import("../models/Tour")).default
        const TimeSlot = (await import("../models/TimeSlot")).default

        // Get all tours
        const tours = await Tour.find({})

        // Get time slot counts for each tour
        const tourDebugData = await Promise.all(
            tours.map(async (tour) => {
                const timeSlotCount = await TimeSlot.countDocuments({
                    packageId: tour._id
                })

                const latestSlot = await TimeSlot.findOne({
                    packageId: tour._id
                }).sort({ date: -1 })

                const earliestSlot = await TimeSlot.findOne({
                    packageId: tour._id
                }).sort({ date: 1 })

                return {
                    _id: tour._id,
                    title: tour.title,
                    slug: tour.slug,
                    departureTimes: tour.departureTimes || [],
                    timeSlotCount,
                    dateRange: timeSlotCount > 0 ? {
                        earliest: earliestSlot?.date,
                        latest: latestSlot?.date
                    } : null,
                    hasTimeSlots: timeSlotCount > 0
                }
            })
        )

        const summary = {
            totalTours: tours.length,
            toursWithTimeSlots: tourDebugData.filter(t => t.hasTimeSlots).length,
            toursWithoutTimeSlots: tourDebugData.filter(t => !t.hasTimeSlots).length,
            totalTimeSlots: tourDebugData.reduce((sum, t) => sum + t.timeSlotCount, 0)
        }

        res.json({
            success: true,
            data: {
                summary,
                tours: tourDebugData
            }
        })
    } catch (error: any) {
        console.error("Error getting debug tours:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}
