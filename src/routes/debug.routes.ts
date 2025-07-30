import { Router } from "express"
import { debugTours } from "../controllers/debug.controller"

const debugRouter = Router()

// GET /api/debug/tours - Get all tours with time slot counts
debugRouter.get("/tours", debugTours)

export default debugRouter
