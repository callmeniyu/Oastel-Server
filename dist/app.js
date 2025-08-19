"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env"); // Load environment variables first
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const tour_routes_1 = __importDefault(require("./routes/tour.routes"));
const transfer_routes_1 = __importDefault(require("./routes/transfer.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const blackoutDate_routes_1 = __importDefault(require("./routes/blackoutDate.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const timeSlot_routes_1 = __importDefault(require("./routes/timeSlot.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const cartBooking_routes_1 = __importDefault(require("./routes/cartBooking.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/tours", tour_routes_1.default);
app.use("/api/transfers", transfer_routes_1.default);
app.use("/api/bookings", booking_routes_1.default);
app.use("/api/blackout-dates", blackoutDate_routes_1.default);
app.use("/api/blogs", blog_routes_1.default);
app.use("/api/upload", upload_routes_1.default);
console.log("🔗 Registering timeslots routes at /api/timeslots");
app.use("/api/timeslots", timeSlot_routes_1.default);
app.use("/api/cart", cart_routes_1.default);
app.use("/api/cart-booking", cartBooking_routes_1.default);
app.use("/api/users", user_routes_1.default);
exports.default = app;
