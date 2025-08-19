"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchemaZod = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
// Zod schema for validation
exports.userSchemaZod = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    image: { type: String },
    location: { type: String },
    bio: { type: String },
    address: {
        whatsapp: String,
        phone: String,
        pickupAddresses: [String],
    },
    cartId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Cart" },
    bookings: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Booking" }],
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("User", UserSchema);
