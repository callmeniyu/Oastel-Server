"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateAddress = exports.updateProfile = exports.getUserProfile = void 0;
const user_service_1 = require("../services/user.service");
const getUserProfile = async (req, res, next) => {
    try {
        const { email } = req.params;
        if (!email)
            return res.status(400).json({ message: "Email is required" });
        const user = await (0, user_service_1.getUserByEmail)(email);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                image: user.image,
                location: user.location,
                bio: user.bio,
                address: user.address,
                hasPassword: user.passwordHash && user.passwordHash.length > 0
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserProfile = getUserProfile;
const updateProfile = async (req, res, next) => {
    try {
        const { email, name, location, bio, image } = req.body;
        if (!email)
            return res.status(400).json({ message: "Email is required" });
        const updatedUser = await (0, user_service_1.updateUserProfile)(email, { name, location, bio, image });
        if (!updatedUser)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateProfile = updateProfile;
const updateAddress = async (req, res, next) => {
    try {
        const { email, whatsapp, phone, pickupAddresses } = req.body;
        if (!email)
            return res.status(400).json({ message: "Email is required" });
        const updatedUser = await (0, user_service_1.updateUserAddress)(email, { whatsapp, phone, pickupAddresses });
        if (!updatedUser)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({
            success: true,
            message: "Address updated successfully",
            data: updatedUser
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateAddress = updateAddress;
const deleteAccount = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ message: "Email is required" });
        const user = await (0, user_service_1.deleteUserByEmail)(email);
        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteAccount = deleteAccount;
