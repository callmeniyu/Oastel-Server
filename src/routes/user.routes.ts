import { Router } from "express";
import { deleteAccount } from "../controllers/user.controller";

const router = Router();

router.delete("/delete", deleteAccount);

export default router;
