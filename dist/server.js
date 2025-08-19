"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env"); // Load environment variables first
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const reviewScheduler_service_1 = __importDefault(require("./services/reviewScheduler.service"));
const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || '10.22.11.50';
// Connect to MongoDB first
(0, db_1.default)().then(() => {
    // Only start the server after successful database connection
    app_1.default.listen(PORT, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
        // Start the review email scheduler
        reviewScheduler_service_1.default.start();
    });
}).catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    reviewScheduler_service_1.default.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    reviewScheduler_service_1.default.stop();
    process.exit(0);
});
