import { Request, Response } from "express";
import BlackoutDate from "../models/BlackoutDate";

export const addBlackoutDate = async (req: Request, res: Response) => {
  try {
    const { date, packageType, description } = req.body;

    if (!date || !packageType) {
      return res.status(400).json({
        success: false,
        message: "Date and packageType are required",
      });
    }

    const existing = await BlackoutDate.findOne({ date, packageType });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Blackout date already exists for this package type",
      });
    }

    const blackoutDate = new BlackoutDate({ date, packageType, description });
    await blackoutDate.save();

    res.status(201).json({
      success: true,
      message: "Blackout date added successfully",
      data: blackoutDate,
    });
  } catch (error) {
    console.error("Error adding blackout date:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeBlackoutDate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const blackoutDate = await BlackoutDate.findByIdAndDelete(id);

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
  } catch (error) {
    console.error("Error removing blackout date:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listBlackoutDates = async (req: Request, res: Response) => {
  try {
    const blackoutDates = await BlackoutDate.find().sort({ date: 1 });

    res.json({
      success: true,
      data: blackoutDates,
    });
  } catch (error) {
    console.error("Error listing blackout dates:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
