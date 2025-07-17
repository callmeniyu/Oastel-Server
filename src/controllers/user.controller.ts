import { Request, Response, NextFunction } from "express";
import { deleteUserByEmail } from "../services/user.service";

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await deleteUserByEmail(email);
    return res.status(200).json({ message: "Account deleted", user });
  } catch (err) {
    next(err);
  }
};
