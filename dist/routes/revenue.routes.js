"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const revenue_controller_1 = require("../controllers/revenue.controller");
console.log("Revenue routes initialized");
const router = express_1.default.Router();
router.get("/", revenue_controller_1.getRevenueData);
exports.default = router;
