import { Router } from "express";
import { deleteAccount, updateProfile, updateAddress, getUserProfile } from "../controllers/user.controller";

const router = Router();

router.get("/profile/:email", getUserProfile);
router.put("/profile", updateProfile);
router.put("/address", updateAddress);
router.delete("/delete", deleteAccount);

export default router;
