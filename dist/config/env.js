"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// src/config/env.ts
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
// Load environment variables from .env file
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]),
    PORT: zod_1.z.string().default("3001"),
    MONGO_URI: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string(),
    CORS_ORIGIN: zod_1.z.string(),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string(),
    CLOUDINARY_API_KEY: zod_1.z.string(),
    CLOUDINARY_API_SECRET: zod_1.z.string(),
});
// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error("❌ Invalid environment variables:", parsedEnv.error.format());
    throw new Error("Invalid environment configuration");
}
// Export type-safe environment variables
exports.env = {
    NODE_ENV: parsedEnv.data.NODE_ENV,
    PORT: parsedEnv.data.PORT,
    MONGO_URI: parsedEnv.data.MONGO_URI,
    JWT_SECRET: parsedEnv.data.JWT_SECRET,
    CORS_ORIGIN: parsedEnv.data.CORS_ORIGIN,
    CLOUDINARY_CLOUD_NAME: parsedEnv.data.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: parsedEnv.data.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: parsedEnv.data.CLOUDINARY_API_SECRET,
};
