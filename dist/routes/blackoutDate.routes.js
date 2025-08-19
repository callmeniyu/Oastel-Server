"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blackoutDate_controller_1 = require("../controllers/blackoutDate.controller");
const router = (0, express_1.Router)();
router.post("/", blackoutDate_controller_1.addBlackoutDate);
router.get("/", blackoutDate_controller_1.listBlackoutDates);
router.delete("/:id", blackoutDate_controller_1.removeBlackoutDate);
exports.default = router;
