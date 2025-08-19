"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBlackoutDates = exports.removeBlackoutDate = exports.addBlackoutDate = void 0;
const BlackoutDate_1 = __importDefault(require("../models/BlackoutDate"));
const addBlackoutDate = async (req, res) => {
    try {
        const { date, packageType, description } = req.body;
        if (!date || !packageType) {
            return res.status(400).json({
                success: false,
                message: "Date and packageType are required",
            });
        }
        const existing = await BlackoutDate_1.default.findOne({ date, packageType });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Blackout date already exists for this package type",
            });
        }
        const blackoutDate = new BlackoutDate_1.default({ date, packageType, description });
        await blackoutDate.save();
        res.status(201).json({
            success: true,
            message: "Blackout date added successfully",
            data: blackoutDate,
        });
    }
    catch (error) {
        console.error("Error adding blackout date:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.addBlackoutDate = addBlackoutDate;
const removeBlackoutDate = async (req, res) => {
    try {
        const { id } = req.params;
        const blackoutDate = await BlackoutDate_1.default.findByIdAndDelete(id);
        if (!blackoutDate) {
            return res.status(404).json({
                success: false,
                message: "Blackout date not found",
            });
        }
        res.json({
            success: true,
            message: "Blackout date removed successfully",
        });
    }
    catch (error) {
        console.error("Error removing blackout date:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.removeBlackoutDate = removeBlackoutDate;
const listBlackoutDates = async (req, res) => {
    try {
        const blackoutDates = await BlackoutDate_1.default.find().sort({ date: 1 });
        res.json({
            success: true,
            data: blackoutDates,
        });
    }
    catch (error) {
        console.error("Error listing blackout dates:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.listBlackoutDates = listBlackoutDates;
