import express from "express";
import { getRevenueData } from "../controllers/revenue.controller";

console.log("Revenue routes initialized");
const router = express.Router();

router.get("/", getRevenueData);

export default router;
