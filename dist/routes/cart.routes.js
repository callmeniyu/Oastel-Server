"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cart_controller_1 = __importDefault(require("../controllers/cart.controller"));
const router = express_1.default.Router();
// Get user's cart
router.get('/:userEmail', cart_controller_1.default.getCart.bind(cart_controller_1.default));
// Add item to cart
router.post('/', cart_controller_1.default.addToCart.bind(cart_controller_1.default));
// Update cart item
router.put('/:userEmail/items/:itemId', cart_controller_1.default.updateCartItem.bind(cart_controller_1.default));
// Remove item from cart
router.delete('/:userEmail/items/:itemId', cart_controller_1.default.removeFromCart.bind(cart_controller_1.default));
// Clear entire cart
router.delete('/:userEmail', cart_controller_1.default.clearCart.bind(cart_controller_1.default));
// Get cart item count
router.get('/:userEmail/count', cart_controller_1.default.getCartItemCount.bind(cart_controller_1.default));
// Get cart summary
router.get('/:userEmail/summary', cart_controller_1.default.getCartSummary.bind(cart_controller_1.default));
exports.default = router;
