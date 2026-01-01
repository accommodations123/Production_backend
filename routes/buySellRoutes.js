import express from "express";
const router = express.Router();

/* =========================
   Middleware
========================= */
import userAuth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import { uploadListingImages } from "../middleware/uploads/sell.upload.js";
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'
/* =========================
   Controllers
========================= */
import {
  createBuySellListing,
  getActiveBuySellListings,
  getBuySellListingById,
  getMyBuySellListings,
  updateBuySellListing,
  markBuySellAsSold,
  deleteBuySellListing,
  getPendingBuySellListings,
  approveBuySellListing,
  blockBuySellListing
} from "../controllers/buySellController.js";

/* =========================
   USER ROUTES
========================= */

// Create listing (goes to pending)
router.post("/create",userAuth,uploadListingImages.array("galleryImages", 10),multerErrorHandler,createBuySellListing);


// Public listings (only active)
router.get("/get", getActiveBuySellListings);

// Public single listing
router.get("/get/:id", getBuySellListingById);

// User dashboard listings
router.get("/my-buy-sell", userAuth, getMyBuySellListings);

// Update listing (owner only)
router.put("/update/:id", userAuth, updateBuySellListing);

// Mark listing as sold
router.patch("/buy-sell/:id/sold", userAuth, markBuySellAsSold);

// Delete listing
router.delete("/delete/:id", userAuth, deleteBuySellListing);

/* =========================
   ADMIN ROUTES
========================= */

// View pending listings
router.get("/admin/buy-sell/pending",adminAuth,getPendingBuySellListings);

// Approve listing
router.patch("/admin/buy-sell/:id/approve",adminAuth,approveBuySellListing);

// Block listing
router.patch("/admin/buy-sell/:id/block",adminAuth,blockBuySellListing);

export default router;
