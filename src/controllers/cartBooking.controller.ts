import { Request, Response } from 'express';
import { cartBookingService, CartBookingRequest } from '../services/cartBooking.service';

export class CartBookingController {
  // Book all items in cart
  async bookCartItems(req: Request, res: Response): Promise<void> {
    try {
      const { userEmail, contactInfo } = req.body;

      // Validate request
      if (!userEmail || !contactInfo) {
        res.status(400).json({
          success: false,
          message: 'User email and contact info are required'
        });
        return;
      }

      if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
        res.status(400).json({
          success: false,
          message: 'Name, email, and phone are required in contact info'
        });
        return;
      }

      const request: CartBookingRequest = {
        userEmail,
        contactInfo
      };

      const result = await cartBookingService.bookCartItems(request);

      if (result.success) {
        const confirmationPath = `/booking/cart-confirmation?bookings=${encodeURIComponent(result.bookings.join(','))}`;
        res.status(200).json({
          success: true,
          message: `Successfully created ${result.bookings.length} booking(s)`,
          data: {
            bookingIds: result.bookings,
            warnings: result.warnings,
            totalBookings: result.bookings.length,
            confirmationPath
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to create bookings from cart',
          errors: result.errors,
          warnings: result.warnings
        });
      }
    } catch (error) {
      console.error('Error in bookCartItems controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while processing cart booking'
      });
    }
  }

  // Get booking summary for cart items
  async getCartBookingSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userEmail } = req.params;

      if (!userEmail) {
        res.status(400).json({
          success: false,
          message: 'User email is required'
        });
        return;
      }

      const summary = await cartBookingService.getCartBookingSummary(decodeURIComponent(userEmail));

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error in getCartBookingSummary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while getting cart booking summary'
      });
    }
  }
}

export const cartBookingController = new CartBookingController();
