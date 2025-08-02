import User, { Address } from "../models/User";
// import bcrypt from "bcryptjs";

export const getUserByEmail = async (email: string) => {
  try {
    // First, use raw MongoDB operations to clean up the user without validation
    const userDoc = await User.collection.findOne({ email });
    
    if (!userDoc) {
      return null;
    }

    // Clean up corrupted fields using raw MongoDB operations
    let needsCleanup = false;
    const updateFields: any = {};

    // Check for corrupted cartId
    if (userDoc.cartId === "" || userDoc.cartId === null || 
        (typeof userDoc.cartId === "string" && userDoc.cartId.trim() === "")) {
      updateFields.$unset = { cartId: 1 };
      needsCleanup = true;
    }

    // Check for corrupted bookings
    if (userDoc.bookings === "" || userDoc.bookings === null ||
        userDoc.bookings === "[ '' ]" || 
        (Array.isArray(userDoc.bookings) && userDoc.bookings.some((b: any) => b === "" || b === null)) ||
        (typeof userDoc.bookings === "string")) {
      updateFields.bookings = [];
      needsCleanup = true;
    }

    // Perform cleanup if needed
    if (needsCleanup) {
      await User.collection.updateOne({ email }, updateFields);
    }

    // Now fetch the user using Mongoose with clean data
    const cleanUser = await User.findOne({ email });
    return cleanUser;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    return null;
  }
};

export const updateUserProfile = async (email: string, updateData: {
  name?: string;
  location?: string;
  bio?: string;
  image?: string;
}) => {
  const user = await User.findOneAndUpdate(
    { email },
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-passwordHash');
  
  return user;
};

export const updateUserAddress = async (email: string, addressData: Address) => {
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { address: addressData } },
    { new: true, runValidators: true }
  ).select('-passwordHash');
  
  return user;
};

export const deleteUserByEmail = async (email: string) => {
  const user = await User.findOneAndDelete({ email });
  if (!user) throw new Error("User not found");
  return user;
};

export default {
  getUserByEmail,
  updateUserProfile,
  updateUserAddress,
  deleteUserByEmail
};
