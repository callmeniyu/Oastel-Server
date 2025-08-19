"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transfer_controller_1 = require("../controllers/transfer.controller");
const router = (0, express_1.Router)();
// Create a new transfer
router.post("/", transfer_controller_1.createTransfer);
// Get all transfers with pagination and filtering
router.get("/", transfer_controller_1.getTransfers);
// Get unique vehicles from private transfers
router.get("/vehicles", transfer_controller_1.getVehicles);
// Get the most recently created transfer (debug helper)
router.get("/last", transfer_controller_1.getLastTransfer);
// Check slug availability
router.get("/check-slug/:slug", transfer_controller_1.checkSlugAvailability);
// Get transfer by slug
router.get("/slug/:slug", transfer_controller_1.getTransferBySlug);
// Get transfer by ID
router.get("/:id", transfer_controller_1.getTransferById);
// Update transfer
router.put("/:id", transfer_controller_1.updateTransfer);
// Update transfer status (partial update)
router.patch("/:id", transfer_controller_1.updateTransferStatus);
// Delete transfer
router.delete("/:id", transfer_controller_1.deleteTransfer);
exports.default = router;
