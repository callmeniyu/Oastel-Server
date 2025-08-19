"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Cart item subdocument schema
const CartItemSchema = new mongoose_1.Schema({
    packageId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        refPath: 'packageType'
    },
    packageType: {
        type: String,
        enum: ['tour', 'transfer'],
        required: true
    },
    packageTitle: {
        type: String,
        required: true
    },
    packageImage: {
        type: String,
        required: true
    },
    packagePrice: {
        type: Number,
        required: true,
        min: 0
    },
    selectedDate: {
        type: Date,
        required: true
    },
    selectedTime: {
        type: String,
        required: true
    },
    adults: {
        type: Number,
        required: true,
        min: 1,
        max: 20
    },
    children: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    pickupLocation: {
        type: String,
        default: ''
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });
// Main cart schema
const CartSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    totalAmount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});
// Indexes for performance
CartSchema.index({ userId: 1 });
CartSchema.index({ 'items.packageId': 1 });
CartSchema.index({ createdAt: -1 });
// Pre-save middleware to calculate total amount
CartSchema.pre('save', function () {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
});
// Instance methods
CartSchema.methods.addItem = function (item) {
    // Check if item already exists (same package, date, time)
    const existingItemIndex = this.items.findIndex((cartItem) => cartItem.packageId.toString() === item.packageId.toString() &&
        cartItem.selectedDate.toDateString() === item.selectedDate.toDateString() &&
        cartItem.selectedTime === item.selectedTime);
    if (existingItemIndex > -1) {
        // Update existing item
        this.items[existingItemIndex] = item;
    }
    else {
        // Add new item
        this.items.push(item);
    }
    return this.save();
};
CartSchema.methods.removeItem = function (itemId) {
    this.items.id(itemId).deleteOne();
    return this.save();
};
CartSchema.methods.updateItem = function (itemId, updates) {
    const item = this.items.id(itemId);
    if (item) {
        Object.assign(item, updates);
        // Recalculate total price for the item
        if (updates.adults !== undefined || updates.children !== undefined || updates.packagePrice !== undefined) {
            const adults = updates.adults !== undefined ? updates.adults : item.adults;
            const children = updates.children !== undefined ? updates.children : item.children;
            const price = updates.packagePrice !== undefined ? updates.packagePrice : item.packagePrice;
            item.totalPrice = (adults + children) * price;
        }
    }
    return this.save();
};
CartSchema.methods.clearCart = function () {
    this.items = [];
    return this.save();
};
CartSchema.methods.getItemCount = function () {
    return this.items.length;
};
exports.default = mongoose_1.default.model('Cart', CartSchema);
