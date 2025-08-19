"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BlackoutDateSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, unique: true },
    packageType: { type: String, enum: ["tour", "transfer"], required: true },
    description: { type: String, default: "" },
});
const BlackoutDate = (0, mongoose_1.model)("BlackoutDate", BlackoutDateSchema);
exports.default = BlackoutDate;
