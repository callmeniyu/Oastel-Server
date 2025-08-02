import { Request, Response, NextFunction } from "express";
import { deleteUserByEmail, updateUserProfile, updateUserAddress, getUserByEmail } from "../services/user.service";



export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

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
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, location, bio, image } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const updatedUser = await updateUserProfile(email, { name, location, bio, image });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ 
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, whatsapp, phone, pickupAddresses } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const updatedUser = await updateUserAddress(email, { whatsapp, phone, pickupAddresses });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ 
      success: true,
      message: "Address updated successfully",
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await deleteUserByEmail(email);
    return res.status(200).json({ 
      success: true,
      message: "Account deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};
