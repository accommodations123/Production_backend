import express from "express";
import {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlistStatus,
    toggleWishlist
} from "../controllers/wishlistController.js";
import userAuth from "../middleware/userAuth.js"; // Assuming standard auth middleware exists

const router = express.Router();

router.post("/add", userAuth, addToWishlist);
router.post("/toggle", userAuth, toggleWishlist);
router.delete("/:type/:id", userAuth, removeFromWishlist);
router.get("/", userAuth, getWishlist);
router.get("/check/:type/:id", userAuth, checkWishlistStatus);

export default router;
