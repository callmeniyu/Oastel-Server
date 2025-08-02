import CartModel, { CartItem, CartType } from "../models/Cart";
import mongoose from "mongoose";

class CartService {
  // Get cart by user ID
  async getCartByUserId(userId: string): Promise<CartType | null> {
    try {
      const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        .populate({
          path: 'items.packageId',
          select: 'title newPrice duration type images',
        });
      
      return cart;
    } catch (error) {
      console.error("Error getting cart by user ID:", error);
      throw error;
    }
  }

  // Add item to cart
  async addToCart(userId: string, item: CartItem): Promise<CartType> {
    try {
      let cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (cart) {
        // Check if item with same package, date, and time already exists
        const existingItemIndex = cart.items.findIndex(
          (cartItem) =>
            cartItem.packageId.toString() === item.packageId.toString() &&
            cartItem.date === item.date &&
            cartItem.time === item.time
        );

        if (existingItemIndex > -1) {
          // Update existing item
          cart.items[existingItemIndex].adults = item.adults;
          cart.items[existingItemIndex].children = item.children;
          if (item.pickupLocation !== undefined) {
            cart.items[existingItemIndex].pickupLocation = item.pickupLocation;
          }
        } else {
          // Add new item
          cart.items.push(item);
        }
      } else {
        // Create new cart
        cart = new CartModel({
          userId: new mongoose.Types.ObjectId(userId),
          items: [item]
        });
      }

      await cart.save();
      
      // Populate and return
      const populatedCart = await CartModel.findById(cart._id)
        .populate({
          path: 'items.packageId',
          select: 'title newPrice duration type images',
        });
      
      return populatedCart!;
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }

  // Update cart item
  async updateCartItem(userId: string, itemIndex: number, updates: Partial<CartItem>): Promise<CartType | null> {
    try {
      const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (!cart || !cart.items[itemIndex]) {
        throw new Error("Cart item not found");
      }

      // Update the specific item
      Object.assign(cart.items[itemIndex], updates);
      await cart.save();
      
      // Populate and return
      const populatedCart = await CartModel.findById(cart._id)
        .populate({
          path: 'items.packageId',
          select: 'title newPrice duration type images',
        });
      
      return populatedCart;
    } catch (error) {
      console.error("Error updating cart item:", error);
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(userId: string, itemIndex: number): Promise<CartType | null> {
    try {
      const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (!cart || !cart.items[itemIndex]) {
        throw new Error("Cart item not found");
      }

      cart.items.splice(itemIndex, 1);
      await cart.save();
      
      // Populate and return
      const populatedCart = await CartModel.findById(cart._id)
        .populate({
          path: 'items.packageId',
          select: 'title newPrice duration type images',
        });
      
      return populatedCart;
    } catch (error) {
      console.error("Error removing from cart:", error);
      throw error;
    }
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<CartType | null> {
    try {
      const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      
      if (!cart) {
        throw new Error("Cart not found");
      }

      cart.items = [];
      await cart.save();
      
      return cart;
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }
}

export default new CartService();
