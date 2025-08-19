"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserByEmail = exports.updateUserAddress = exports.updateUserProfile = exports.getUserByEmail = void 0;
const User_1 = __importDefault(require("../models/User"));
// import bcrypt from "bcryptjs";
const getUserByEmail = async (email) => {
    try {
        // First, use raw MongoDB operations to clean up the user without validation
        const userDoc = await User_1.default.collection.findOne({ email });
        if (!userDoc) {
            return null;
        }
        // Clean up corrupted fields using raw MongoDB operations
        let needsCleanup = false;
        const updateFields = {};
        // Check for corrupted cartId
        if (userDoc.cartId === "" || userDoc.cartId === null ||
            (typeof userDoc.cartId === "string" && userDoc.cartId.trim() === "")) {
            updateFields.$unset = { cartId: 1 };
            needsCleanup = true;
        }
        // Check for corrupted bookings
        if (userDoc.bookings === "" || userDoc.bookings === null ||
            userDoc.bookings === "[ '' ]" ||
            (Array.isArray(userDoc.bookings) && userDoc.bookings.some((b) => b === "" || b === null)) ||
            (typeof userDoc.bookings === "string")) {
            updateFields.bookings = [];
            needsCleanup = true;
        }
        // Perform cleanup if needed
        if (needsCleanup) {
            await User_1.default.collection.updateOne({ email }, updateFields);
        }
        // Now fetch the user using Mongoose with clean data
        const cleanUser = await User_1.default.findOne({ email });
        return cleanUser;
    }
    catch (error) {
        console.error("Error in getUserByEmail:", error);
        return null;
    }
};
exports.getUserByEmail = getUserByEmail;
const updateUserProfile = async (email, updateData) => {
    const user = await User_1.default.findOneAndUpdate({ email }, { $set: updateData }, { new: true, runValidators: true }).select('-passwordHash');
    return user;
};
exports.updateUserProfile = updateUserProfile;
const updateUserAddress = async (email, addressData) => {
    const user = await User_1.default.findOneAndUpdate({ email }, { $set: { address: addressData } }, { new: true, runValidators: true }).select('-passwordHash');
    return user;
};
exports.updateUserAddress = updateUserAddress;
const deleteUserByEmail = async (email) => {
    const user = await User_1.default.findOneAndDelete({ email });
    if (!user)
        throw new Error("User not found");
    return user;
};
exports.deleteUserByEmail = deleteUserByEmail;
exports.default = {
    getUserByEmail: exports.getUserByEmail,
    updateUserProfile: exports.updateUserProfile,
    updateUserAddress: exports.updateUserAddress,
    deleteUserByEmail: exports.deleteUserByEmail
};
