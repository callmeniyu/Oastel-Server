import { Router } from "express";
import { addBlackoutDate, removeBlackoutDate, listBlackoutDates } from "../controllers/blackoutDate.controller";

const router = Router();

router.post("/", addBlackoutDate);
router.get("/", listBlackoutDates);
router.delete("/:id", removeBlackoutDate);

export default router;
