// src/config/env.ts
import { z } from "zod"
import { config } from "dotenv"

// Load environment variables from .env file
config()

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.string().default("3001"),
    MONGO_URI: z.string(),
    JWT_SECRET: z.string(),
    CORS_ORIGIN: z.string(),
})

export const env = envSchema.parse(process.env)
