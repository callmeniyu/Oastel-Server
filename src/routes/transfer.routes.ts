import { Router } from "express"
import {
    createTransfer,
    getTransfers,
    getTransferById,
    getTransferBySlug,
    updateTransfer,
    updateTransferStatus,
    deleteTransfer,
    checkSlugAvailability,
    getVehicles,
    getLastTransfer,
} from "../controllers/transfer.controller"

const router = Router()

// Create a new transfer
router.post("/", createTransfer)

// Get all transfers with pagination and filtering
router.get("/", getTransfers)

// Get unique vehicles from private transfers
router.get("/vehicles", getVehicles)

// Get the most recently created transfer (debug helper)
router.get("/last", getLastTransfer)

// Check slug availability
router.get("/check-slug/:slug", checkSlugAvailability)

// Get transfer by slug
router.get("/slug/:slug", getTransferBySlug)

// Get transfer by ID
router.get("/:id", getTransferById)

// Update transfer
router.put("/:id", updateTransfer)

// Update transfer status (partial update)
router.patch("/:id", updateTransferStatus)

// Delete transfer
router.delete("/:id", deleteTransfer)

export default router
