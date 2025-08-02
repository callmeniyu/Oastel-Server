import { Router } from 'express';
import cartController from '../controllers/cart.controller';

const router = Router();

// Get cart for user
router.get('/:userEmail', cartController.getCart);

// Add item to cart
router.post('/', cartController.addToCart);

// Update cart item
router.put('/:userEmail/items/:itemId', cartController.updateCartItem);

// Remove item from cart
router.delete('/:userEmail/items/:itemId', cartController.removeFromCart);

// Clear entire cart
router.delete('/:userEmail', cartController.clearCart);

// Get cart item count
router.get('/:userEmail/count', cartController.getCartItemCount);

export default router;
