import express from "express";
import cartController from "../controllers/cart.controller";

const router = express.Router();

router.get("/:userId", cartController.getCartByUserId);
router.post("/", cartController.addToCart);
router.put("/:userId/:itemIndex", cartController.updateCartItem);
router.delete("/:userId/:itemIndex", cartController.removeFromCart);
router.delete("/:userId", cartController.clearCart);

export default router;
