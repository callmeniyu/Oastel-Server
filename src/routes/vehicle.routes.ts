import { Router } from "express"
import { createVehicle, listVehicles, getVehicleById, updateVehicle, deleteVehicle } from "../controllers/vehicle.controller"

const router = Router()

router.post("/", createVehicle)
router.get("/", listVehicles)
router.get("/:id", getVehicleById)
router.put("/:id", updateVehicle)
router.delete("/:id", deleteVehicle)

export default router
