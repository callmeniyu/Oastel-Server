import { Request, Response } from "express"
import Vehicle from "../models/Vehicle"

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const { name, units, seats } = req.body

    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, message: "Name is required" })
    }

    const existing = await Vehicle.findOne({ name })
    if (existing) {
      return res.status(400).json({ success: false, message: "Vehicle already exists" })
    }

    const vehicle = new Vehicle({ name, units: Number(units) || 1, seats: Number(seats) || 4 })
    const saved = await vehicle.save()
    res.status(201).json({ success: true, data: saved })
  } catch (error: any) {
    console.error("Error creating vehicle:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

export const listVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await Vehicle.find({}).sort({ name: 1 }).lean()
    res.json({ success: true, data: vehicles })
  } catch (error: any) {
    console.error("Error listing vehicles:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const vehicle = await Vehicle.findById(id).lean()
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" })
    res.json({ success: true, data: vehicle })
  } catch (error: any) {
    console.error("Error fetching vehicle:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    const vehicle = await Vehicle.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" })
    res.json({ success: true, data: vehicle })
  } catch (error: any) {
    console.error("Error updating vehicle:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const vehicle = await Vehicle.findByIdAndDelete(id)
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" })
    res.json({ success: true, message: "Vehicle deleted" })
  } catch (error: any) {
    console.error("Error deleting vehicle:", error)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}
