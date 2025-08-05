import express from 'express';
import cartController from '../controllers/cart.controller';

const router = express.Router();

// Get user's cart
router.get('/:userEmail', cartController.getCart.bind(cartController));

// Add item to cart
router.post('/', cartController.addToCart.bind(cartController));

// Update cart item
router.put('/:userEmail/items/:itemId', cartController.updateCartItem.bind(cartController));

// Remove item from cart
router.delete('/:userEmail/items/:itemId', cartController.removeFromCart.bind(cartController));

// Clear entire cart
router.delete('/:userEmail', cartController.clearCart.bind(cartController));

// Get cart item count
router.get('/:userEmail/count', cartController.getCartItemCount.bind(cartController));

// Get cart summary
router.get('/:userEmail/summary', cartController.getCartSummary.bind(cartController));

export default router;
