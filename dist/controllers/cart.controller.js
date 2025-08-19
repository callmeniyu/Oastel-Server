"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const cart_service_1 = require("../services/cart.service");
class CartController {
    // Get cart for user
    async getCart(req, res) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'User email is required'
                });
            }
            const cart = await cart_service_1.cartService.getCartWithDetails(userEmail);
            res.json({
                success: true,
                data: cart
            });
        }
        catch (error) {
            console.error('Error getting cart:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get cart'
            });
        }
    }
    // Get cart summary (item count and total amount)
    async getCartSummary(req, res) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).json({ success: false, message: 'User email is required' });
            }
            const cart = await cart_service_1.cartService.getCartWithDetails(userEmail);
            if (!cart) {
                return res.status(404).json({ success: false, message: 'Cart not found' });
            }
            res.json({
                success: true,
                data: {
                    itemCount: cart.items.length,
                    totalAmount: cart.totalAmount
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || 'Failed to get cart summary' });
        }
    }
    // Add item to cart
    async addToCart(req, res) {
        try {
            const { userEmail, packageId, packageType, selectedDate, selectedTime, adults, children, pickupLocation } = req.body;
            // Validation
            if (!userEmail || !packageId || !packageType || !selectedDate || !selectedTime || !adults) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }
            if (!['tour', 'transfer'].includes(packageType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid package type'
                });
            }
            if (adults < 1 || adults > 20) {
                return res.status(400).json({
                    success: false,
                    message: 'Adults count must be between 1 and 20'
                });
            }
            if (children < 0 || children > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Children count must be between 0 and 10'
                });
            }
            // Check if selected date is not in the past
            const selectedDateObj = new Date(selectedDate + 'T12:00:00.000Z'); // Use noon UTC to avoid timezone issues
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDateObj < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected date cannot be in the past'
                });
            }
            const cart = await cart_service_1.cartService.addToCart(userEmail, {
                packageId,
                packageType,
                selectedDate,
                selectedTime,
                adults,
                children: children || 0,
                pickupLocation: pickupLocation || ''
            });
            res.status(201).json({
                success: true,
                message: 'Item added to cart successfully',
                data: cart
            });
        }
        catch (error) {
            console.error('Error adding to cart:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to add item to cart'
            });
        }
    }
    // Update cart item
    async updateCartItem(req, res) {
        try {
            const { userEmail, itemId } = req.params;
            const updates = req.body;
            if (!userEmail || !itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'User email and item ID are required'
                });
            }
            // Validate updates
            if (updates.adults !== undefined && (updates.adults < 1 || updates.adults > 20)) {
                return res.status(400).json({
                    success: false,
                    message: 'Adults count must be between 1 and 20'
                });
            }
            if (updates.children !== undefined && (updates.children < 0 || updates.children > 10)) {
                return res.status(400).json({
                    success: false,
                    message: 'Children count must be between 0 and 10'
                });
            }
            if (updates.selectedDate) {
                const selectedDateObj = new Date(updates.selectedDate + 'T12:00:00.000Z');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDateObj < today) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected date cannot be in the past'
                    });
                }
            }
            const cart = await cart_service_1.cartService.updateCartItem(userEmail, itemId, updates);
            res.json({
                success: true,
                message: 'Cart item updated successfully',
                data: cart
            });
        }
        catch (error) {
            console.error('Error updating cart item:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update cart item'
            });
        }
    }
    // Remove item from cart
    async removeFromCart(req, res) {
        try {
            const { userEmail, itemId } = req.params;
            if (!userEmail || !itemId) {
                return res.status(400).json({
                    success: false,
                    message: 'User email and item ID are required'
                });
            }
            const cart = await cart_service_1.cartService.removeFromCart(userEmail, itemId);
            res.json({
                success: true,
                message: 'Item removed from cart successfully',
                data: cart
            });
        }
        catch (error) {
            console.error('Error removing from cart:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to remove item from cart'
            });
        }
    }
    // Clear entire cart
    async clearCart(req, res) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'User email is required'
                });
            }
            const cart = await cart_service_1.cartService.clearCart(userEmail);
            res.json({
                success: true,
                message: 'Cart cleared successfully',
                data: cart
            });
        }
        catch (error) {
            console.error('Error clearing cart:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to clear cart'
            });
        }
    }
    // Get cart item count
    async getCartItemCount(req, res) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'User email is required'
                });
            }
            const count = await cart_service_1.cartService.getCartItemCount(userEmail);
            res.json({
                success: true,
                data: { count }
            });
        }
        catch (error) {
            console.error('Error getting cart item count:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get cart item count'
            });
        }
    }
}
exports.CartController = CartController;
exports.default = new CartController();
