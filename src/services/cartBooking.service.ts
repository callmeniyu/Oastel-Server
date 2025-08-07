import Cart, { ICart, ICartItem } from '../models/Cart';
import Booking from '../models/Booking';
import User from '../models/User';
import Tour from '../models/Tour';
import Transfer from '../models/Transfer';
import mongoose from 'mongoose';

export interface CartBookingRequest {
  userEmail: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };
}

export interface CartBookingResult {
  success: boolean;
  bookings: string[]; // Array of booking IDs
  errors: string[];
  warnings: string[];
}

export class CartBookingService {
  // Book all items in cart with comprehensive validation
  async bookCartItems(request: CartBookingRequest): Promise<CartBookingResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result: CartBookingResult = {
        success: false,
        bookings: [],
        errors: [],
        warnings: []
      };

      // Get user and cart
      console.log('Cart booking: Looking for user with email:', request.userEmail);
      const user = await User.findOne({ email: request.userEmail }).session(session);
      if (!user) {
        console.log('Cart booking: User not found in database');
        result.errors.push(`User not found: ${request.userEmail}`);
        return result;
      }
      console.log('Cart booking: Found user:', user._id, user.name || 'No name');

      console.log('Cart booking: Looking for cart for user:', user._id);
      const cart = await Cart.findOne({ userId: user._id }).session(session);
      if (!cart || cart.items.length === 0) {
        console.log('Cart booking: Cart not found or empty');
        result.errors.push('Cart is empty or not found');
        return result;
      }
      console.log('Cart booking: Found cart with', cart.items.length, 'items');

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time for date comparison

      // Validate each cart item and create bookings
      for (const item of cart.items) {
        try {
          // Date validation
          const itemDate = new Date(item.selectedDate);
          itemDate.setHours(0, 0, 0, 0);

          if (itemDate < currentDate) {
            result.warnings.push(
              `${item.packageTitle}: Selected date (${itemDate.toLocaleDateString()}) has already passed. Skipping this item.`
            );
            continue;
          }

          // Package availability validation
          let packageDoc: any;
          if (item.packageType === 'tour') {
            packageDoc = await Tour.findById(item.packageId).session(session);
          } else {
            packageDoc = await Transfer.findById(item.packageId).session(session);
          }

          if (!packageDoc) {
            result.warnings.push(`${item.packageTitle}: Package no longer available. Skipping this item.`);
            continue;
          }

          // Check for existing booking on same date/time
          const existingBooking = await Booking.findOne({
            userId: user._id,
            packageId: item.packageId,
            date: item.selectedDate,
            time: item.selectedTime,
            status: { $in: ['pending', 'confirmed'] }
          }).session(session);

          if (existingBooking) {
            result.warnings.push(
              `${item.packageTitle}: You already have a booking for this date and time. Skipping this item.`
            );
            continue;
          }

          // Create individual booking
          const booking = new Booking({
            userId: user._id,
            packageType: item.packageType,
            packageId: item.packageId,
            date: item.selectedDate,
            time: item.selectedTime,
            adults: item.adults,
            children: item.children,
            pickupLocation: item.pickupLocation,
            status: 'pending',
            firstBookingMinimum: false,
            contactInfo: {
              name: request.contactInfo.name,
              email: request.contactInfo.email,
              phone: request.contactInfo.phone,
              whatsapp: request.contactInfo.whatsapp || request.contactInfo.phone
            },
            paymentInfo: {
              paymentStatus: 'pending',
              amount: item.totalPrice,
              bankCharge: item.totalPrice * 0.028, // 2.8% bank charge
              currency: 'MYR',
              refundStatus: 'none'
            },
            subtotal: item.totalPrice,
            total: item.totalPrice + (item.totalPrice * 0.028)
          });

          const savedBooking = await booking.save({ session });
          result.bookings.push(savedBooking._id.toString());

        } catch (itemError) {
          console.error(`Error processing cart item ${item.packageTitle}:`, itemError);
          result.errors.push(`${item.packageTitle}: Failed to create booking`);
        }
      }

      // If at least one booking was created successfully
      if (result.bookings.length > 0) {
        // Clear the cart after successful bookings
        await Cart.findOneAndUpdate(
          { userId: user._id },
          { $set: { items: [] } },
          { session }
        );

        result.success = true;
        await session.commitTransaction();
      } else {
        result.errors.push('No bookings could be created from cart items');
        await session.abortTransaction();
      }

      return result;

    } catch (error) {
      await session.abortTransaction();
      console.error('Error booking cart items:', error);
      return {
        success: false,
        bookings: [],
        errors: ['Failed to process cart bookings. Please try again.'],
        warnings: []
      };
    } finally {
      session.endSession();
    }
  }

  // Get booking summary for cart items (preview before booking)
  async getCartBookingSummary(userEmail: string): Promise<{
    items: any[];
    validItems: number;
    expiredItems: number;
    totalAmount: number;
    bankCharge: number;
    grandTotal: number;
  }> {
    try {
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        throw new Error('User not found');
      }

      const cart = await Cart.findOne({ userId: user._id });
      if (!cart) {
        return {
          items: [],
          validItems: 0,
          expiredItems: 0,
          totalAmount: 0,
          bankCharge: 0,
          grandTotal: 0
        };
      }

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      let validItems = 0;
      let expiredItems = 0;
      let totalAmount = 0;

      const processedItems = cart.items.map(item => {
        const itemDate = new Date(item.selectedDate);
        itemDate.setHours(0, 0, 0, 0);

        const isExpired = itemDate < currentDate;
        
        if (isExpired) {
          expiredItems++;
        } else {
          validItems++;
          totalAmount += item.totalPrice;
        }

        return {
          ...(item as any).toObject ? (item as any).toObject() : item,
          isExpired,
          dateStatus: isExpired ? 'expired' : 'valid'
        };
      });

      const bankCharge = totalAmount * 0.028;
      const grandTotal = totalAmount + bankCharge;

      return {
        items: processedItems,
        validItems,
        expiredItems,
        totalAmount,
        bankCharge,
        grandTotal
      };

    } catch (error) {
      console.error('Error getting cart booking summary:', error);
      throw error;
    }
  }
}

export const cartBookingService = new CartBookingService();
