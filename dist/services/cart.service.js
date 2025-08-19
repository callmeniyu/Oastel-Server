"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartService = exports.CartService = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const User_1 = __importDefault(require("../models/User"));
const Tour_1 = __importDefault(require("../models/Tour"));
const Transfer_1 = __importDefault(require("../models/Transfer"));
const mongoose_1 = __importDefault(require("mongoose"));
class CartService {
    // Get or create cart for user with caching optimization
    async getCart(userEmail) {
        try {
            // Find user by email
            const user = await User_1.default.findOne({ email: userEmail }).select('_id').lean();
            if (!user) {
                throw new Error('User not found');
            }
            // Find or create cart
            let cart = await Cart_1.default.findOne({ userId: user._id });
            if (!cart) {
                cart = new Cart_1.default({
                    userId: user._id,
                    items: [],
                    totalAmount: 0
                });
                await cart.save();
            }
            return cart;
        }
        catch (error) {
            console.error('Error getting cart:', error);
            throw error;
        }
    }
    // Add item to cart with optimization
    async addToCart(userEmail, item) {
        try {
            const cart = await this.getCart(userEmail);
            // Get package details with minimal fields for performance
            let packageDoc;
            const selectFields = 'title image images newPrice price';
            if (item.packageType === 'tour') {
                packageDoc = await Tour_1.default.findById(item.packageId).select(selectFields).lean();
            }
            else {
                packageDoc = await Transfer_1.default.findById(item.packageId).select(selectFields).lean();
            }
            if (!packageDoc) {
                throw new Error('Package not found');
            }
            // Calculate total price
            const packagePrice = packageDoc.newPrice || packageDoc.price || 0;
            const totalPrice = (item.adults + item.children) * packagePrice;
            // Create cart item
            const cartItem = {
                packageId: new mongoose_1.default.Types.ObjectId(item.packageId),
                packageType: item.packageType,
                packageTitle: packageDoc.title,
                packageImage: packageDoc.images?.[0] || packageDoc.image || '',
                packagePrice: packagePrice,
                selectedDate: new Date(item.selectedDate + 'T12:00:00.000Z'), // Use noon UTC to avoid timezone shifts
                selectedTime: item.selectedTime,
                adults: item.adults,
                children: item.children,
                pickupLocation: item.pickupLocation || '',
                totalPrice: totalPrice,
                addedAt: new Date()
            };
            // Check if item already exists (same package, date, time)
            const existingItemIndex = cart.items.findIndex((cartItem) => cartItem.packageId.toString() === item.packageId &&
                cartItem.selectedDate.toDateString() === new Date(item.selectedDate + 'T12:00:00.000Z').toDateString() &&
                cartItem.selectedTime === item.selectedTime);
            if (existingItemIndex > -1) {
                // Update existing item (merge quantities)
                const existingItem = cart.items[existingItemIndex];
                existingItem.adults = item.adults;
                existingItem.children = item.children;
                existingItem.totalPrice = totalPrice;
                existingItem.pickupLocation = item.pickupLocation || existingItem.pickupLocation;
                existingItem.addedAt = new Date(); // Update timestamp
            }
            else {
                // Add new item
                cart.items.push(cartItem);
            }
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    }
    // Update cart item
    async updateCartItem(userEmail, itemId, updates) {
        try {
            const cart = await this.getCart(userEmail);
            const item = cart.items.find(item => item._id?.toString() === itemId);
            if (!item) {
                throw new Error('Cart item not found');
            }
            // Update fields
            if (updates.adults !== undefined)
                item.adults = updates.adults;
            if (updates.children !== undefined)
                item.children = updates.children;
            if (updates.selectedDate)
                item.selectedDate = new Date(updates.selectedDate + 'T12:00:00.000Z');
            if (updates.selectedTime)
                item.selectedTime = updates.selectedTime;
            if (updates.pickupLocation !== undefined)
                item.pickupLocation = updates.pickupLocation;
            // Recalculate total price
            item.totalPrice = (item.adults + item.children) * item.packagePrice;
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    }
    // Remove item from cart
    async removeFromCart(userEmail, itemId) {
        try {
            const cart = await this.getCart(userEmail);
            // Remove item by _id
            // Remove the item from the cart
            cart.items = cart.items.filter((item) => item._id?.toString() !== itemId);
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    }
    // Clear entire cart
    async clearCart(userEmail) {
        try {
            const cart = await this.getCart(userEmail);
            cart.items = [];
            await cart.save();
            return cart;
        }
        catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }
    // Get cart item count
    async getCartItemCount(userEmail) {
        try {
            const cart = await this.getCart(userEmail);
            return cart.items.length;
        }
        catch (error) {
            console.error('Error getting cart item count:', error);
            return 0;
        }
    }
    // Get cart with populated package details
    async getCartWithDetails(userEmail) {
        try {
            const cart = await this.getCart(userEmail);
            // Manually populate package details
            const populatedItems = await Promise.all(cart.items.map(async (item) => {
                let packageDetails = null;
                if (item.packageType === 'tour') {
                    packageDetails = await Tour_1.default.findById(item.packageId).select('title image newPrice oldPrice slug duration');
                }
                else {
                    packageDetails = await Transfer_1.default.findById(item.packageId).select('title image newPrice oldPrice slug duration');
                }
                return {
                    ...item.toObject ? item.toObject() : item,
                    packageDetails: packageDetails ? {
                        title: packageDetails.title,
                        image: packageDetails.image || '',
                        price: packageDetails.newPrice || packageDetails.oldPrice || 0,
                        slug: packageDetails.slug,
                        duration: packageDetails.duration,
                    } : null
                };
            }));
            return {
                ...cart.toObject ? cart.toObject() : cart,
                items: populatedItems
            };
        }
        catch (error) {
            console.error('Error getting cart with details:', error);
            throw error;
        }
    }
}
exports.CartService = CartService;
exports.cartService = new CartService();
