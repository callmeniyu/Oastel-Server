import { Request, Response } from "express";
import cartService from "../services/cart.service";
import mongoose from "mongoose";

class CartController {
  // Helper method to get user ObjectId from either ObjectId or email
  private async getUserObjectId(userIdentifier: string): Promise<string> {
    if (!userIdentifier || typeof userIdentifier !== "string" || userIdentifier.trim() === "") {
      throw new Error("Invalid user identifier provided");
    }
    
    // If it's already a valid ObjectId, return it
    if (mongoose.Types.ObjectId.isValid(userIdentifier)) {
      return userIdentifier;
    }
    
    // Otherwise, assume it's an email and look up the user
    try {
      const UserModel = mongoose.model('User');
      const user = await UserModel.findOne({ email: userIdentifier }).select('_id');
      if (!user) {
        throw new Error(`User not found for email: ${userIdentifier}`);
      }
      
      return (user._id as mongoose.Types.ObjectId).toString();
    } catch (error: any) {
      console.error("Error finding user:", error);
      throw new Error(`Failed to find user with email: ${userIdentifier}`);
    }
  }

  // Get cart by user ID
  async getCartByUserId(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const userObjectId = await this.getUserObjectId(userId);
      const cart = await cartService.getCartByUserId(userObjectId);
      
      res.json({
        success: true,
        data: cart
      });
    } catch (error: any) {
      console.error("Error getting cart:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add item to cart
  async addToCart(req: Request, res: Response) {
    try {
      console.log("📦 Received cart data:", req.body);
      
      const { userId, packageType, packageId, date, time, adults, children, pickupLocation } = req.body;
      
      if (!userId || !packageType || !packageId || !date || !time || !adults) {
        console.error("Missing required fields:", { userId: !!userId, packageType: !!packageType, packageId: !!packageId, date: !!date, time: !!time, adults: !!adults });
        return res.status(400).json({
          success: false,
          error: "Missing required fields"
        });
      }

      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        console.error("Invalid package ID:", packageId);
        return res.status(400).json({
          success: false,
          error: "Invalid package ID"
        });
      }

      console.log("🔍 Getting user ObjectId for:", userId);
      const userObjectId = await this.getUserObjectId(userId);
      console.log("✅ User ObjectId:", userObjectId);

      const cartItem = {
        packageType,
        packageId: new mongoose.Types.ObjectId(packageId),
        date,
        time,
        adults,
        children: children || 0,
        pickupLocation: pickupLocation || ""
      };

      console.log("🛒 Adding cart item:", cartItem);
      const cart = await cartService.addToCart(userObjectId, cartItem);
      console.log("✅ Cart updated successfully");
      
      res.status(201).json({
        success: true,
        data: cart
      });
    } catch (error: any) {
      console.error("❌ Error adding to cart:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update cart item
  async updateCartItem(req: Request, res: Response) {
    try {
      const { userId, itemIndex } = req.params;
      const updates = req.body;
      
      const userObjectId = await this.getUserObjectId(userId);
      const cart = await cartService.updateCartItem(userObjectId, parseInt(itemIndex), updates);
      
      res.json({
        success: true,
        data: cart
      });
    } catch (error: any) {
      console.error("Error updating cart item:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Remove item from cart
  async removeFromCart(req: Request, res: Response) {
    try {
      const { userId, itemIndex } = req.params;
      
      const userObjectId = await this.getUserObjectId(userId);
      const cart = await cartService.removeFromCart(userObjectId, parseInt(itemIndex));
      
      res.json({
        success: true,
        data: cart
      });
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Clear entire cart
  async clearCart(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const userObjectId = await this.getUserObjectId(userId);
      const cart = await cartService.clearCart(userObjectId);
      
      res.json({
        success: true,
        data: cart
      });
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new CartController();
