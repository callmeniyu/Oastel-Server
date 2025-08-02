import Cart, { ICart, ICartItem } from '../models/Cart';
import User from '../models/User';
import Tour from '../models/Tour';
import Transfer from '../models/Transfer';
import mongoose from 'mongoose';

export class CartService {
  // Get or create cart for user
  async getCart(userEmail: string): Promise<ICart> {
    try {
      // Find user by email
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        throw new Error('User not found');
      }

      // Find or create cart
      let cart = await Cart.findOne({ userId: user._id });

      if (!cart) {
        cart = new Cart({
          userId: user._id,
          items: [],
          totalAmount: 0
        });
        await cart.save();
      }

      return cart;
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  // Add item to cart
  async addToCart(userEmail: string, item: {
    packageId: string;
    packageType: 'tour' | 'transfer';
    selectedDate: string;
    selectedTime: string;
    adults: number;
    children: number;
    pickupLocation?: string;
  }): Promise<ICart> {
    try {
      const cart = await this.getCart(userEmail);

      // Get package details
      let packageDoc: any;
      if (item.packageType === 'tour') {
        packageDoc = await Tour.findById(item.packageId);
      } else {
        packageDoc = await Transfer.findById(item.packageId);
      }
      
      if (!packageDoc) {
        throw new Error('Package not found');
      }

      // Calculate total price
      const packagePrice = packageDoc.newPrice || packageDoc.price || 0;
      const totalPrice = (item.adults + item.children) * packagePrice;

      // Create cart item
      const cartItem: ICartItem = {
        packageId: new mongoose.Types.ObjectId(item.packageId),
        packageType: item.packageType,
        packageTitle: packageDoc.title,
        packageImage: packageDoc.images?.[0] || packageDoc.image || '',
        packagePrice: packagePrice,
        selectedDate: new Date(item.selectedDate),
        selectedTime: item.selectedTime,
        adults: item.adults,
        children: item.children,
        pickupLocation: item.pickupLocation || '',
        totalPrice: totalPrice,
        addedAt: new Date()
      };

      // Check if item already exists (same package, date, time)
      const existingItemIndex = cart.items.findIndex((cartItem: any) => 
        cartItem.packageId.toString() === item.packageId &&
        cartItem.selectedDate.toDateString() === new Date(item.selectedDate).toDateString() &&
        cartItem.selectedTime === item.selectedTime
      );

      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex] = cartItem;
      } else {
        // Add new item
        cart.items.push(cartItem);
      }
      
      await cart.save();
      
      return cart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  // Update cart item
  async updateCartItem(userEmail: string, itemId: string, updates: {
    adults?: number;
    children?: number;
    selectedDate?: string;
    selectedTime?: string;
    pickupLocation?: string;
  }): Promise<ICart> {
    try {
      const cart = await this.getCart(userEmail);
      
      const item = cart.items.find(item => item._id?.toString() === itemId);
      if (!item) {
        throw new Error('Cart item not found');
      }

      // Update fields
      if (updates.adults !== undefined) item.adults = updates.adults;
      if (updates.children !== undefined) item.children = updates.children;
      if (updates.selectedDate) item.selectedDate = new Date(updates.selectedDate);
      if (updates.selectedTime) item.selectedTime = updates.selectedTime;
      if (updates.pickupLocation !== undefined) item.pickupLocation = updates.pickupLocation;

      // Recalculate total price
      item.totalPrice = (item.adults + item.children) * item.packagePrice;

      await cart.save();
      return cart;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(userEmail: string, itemId: string): Promise<ICart> {
    try {
      const cart = await this.getCart(userEmail);
      
      // Remove item by _id
      // Remove the item from the cart
      cart.items = cart.items.filter(item => item._id?.toString() !== itemId);
      
      await cart.save();
      return cart;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // Clear entire cart
  async clearCart(userEmail: string): Promise<ICart> {
    try {
      const cart = await this.getCart(userEmail);
      cart.items = [];
      await cart.save();
      return cart;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Get cart item count
  async getCartItemCount(userEmail: string): Promise<number> {
    try {
      const cart = await this.getCart(userEmail);
      return cart.items.length;
    } catch (error) {
      console.error('Error getting cart item count:', error);
      return 0;
    }
  }

  // Get cart with populated package details
  async getCartWithDetails(userEmail: string): Promise<any> {
    try {
      const cart = await this.getCart(userEmail);
      
      // Manually populate package details
      const populatedItems = await Promise.all(
        cart.items.map(async (item: any) => {
          let packageDetails = null;
          
          if (item.packageType === 'tour') {
            packageDetails = await Tour.findById(item.packageId).select('title image newPrice oldPrice slug duration');
          } else {
            packageDetails = await Transfer.findById(item.packageId).select('title image newPrice oldPrice slug duration');
          }

          return {
            ...item.toObject(),
            packageDetails: packageDetails ? {
              title: packageDetails.title,
              image: (packageDetails as any).image || '',
              price: (packageDetails as any).newPrice || (packageDetails as any).oldPrice || 0,
              slug: (packageDetails as any).slug,
              duration: (packageDetails as any).duration,
            } : null
          };
        })
      );

      return {
        ...cart.toObject(),
        items: populatedItems
      };
    } catch (error) {
      console.error('Error getting cart with details:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();
