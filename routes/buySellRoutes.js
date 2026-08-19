import express from "express";
const router = express.Router();

/* =========================
   Middleware
========================= */
import userAuth, { optionalUserAuth } from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadListingImages } from "../middleware/uploads/sell.upload.js";
import { multerErrorHandler } from '../middleware/uploads/multerErrorHandler.js'
import { creationRateLimit } from "../middleware/rateLimiter.js";
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
   blockBuySellListing,
   getAdminApprovedBuySellListings,
   getAdminBlockedBuySellListings
} from "../controllers/buySellController.js";

/* =========================
   USER ROUTES
========================= */

// Create listing (goes to pending)
router.post("/create", userAuth, creationRateLimit, uploadListingImages.array("galleryImages", 10), multerErrorHandler, createBuySellListing);


// Public listings (only active)
router.get("/get", getActiveBuySellListings);

// Public single listing
router.get("/get/:id", optionalUserAuth, getBuySellListingById);


// User dashboard listings
router.get("/my-buy-sell", userAuth, getMyBuySellListings);

// Update listing (owner only)
router.put("/update/:id", userAuth, uploadListingImages.array("galleryImages", 10), multerErrorHandler, updateBuySellListing);

// Mark listing as sold
router.patch("/buy-sell/:id/sold", userAuth, markBuySellAsSold);

// Delete listing
router.delete("/delete/:id", userAuth, deleteBuySellListing);

/* =========================
   ADMIN ROUTES
========================= */

// View pending listings
router.get("/admin/buy-sell/pending", adminAuth, requireRole("super_admin", "admin"), getPendingBuySellListings);

// Approve listing (support PATCH, PUT, POST)
router.patch("/admin/buy-sell/:id/approve", adminAuth, requireRole("super_admin", "admin"), approveBuySellListing);
router.put("/admin/buy-sell/:id/approve", adminAuth, requireRole("super_admin", "admin"), approveBuySellListing);
router.post("/admin/buy-sell/:id/approve", adminAuth, requireRole("super_admin", "admin"), approveBuySellListing);

// Block listing (support PATCH, PUT, POST)
router.patch("/admin/buy-sell/:id/block", adminAuth, requireRole("super_admin", "admin"), blockBuySellListing);
router.put("/admin/buy-sell/:id/block", adminAuth, requireRole("super_admin", "admin"), blockBuySellListing);
router.post("/admin/buy-sell/:id/block", adminAuth, requireRole("super_admin", "admin"), blockBuySellListing);
router.get("/admin/buy-sell/approved", adminAuth, requireRole("super_admin", "admin"), getAdminApprovedBuySellListings);
router.get("/admin/buy-sell/blocked", adminAuth, requireRole("super_admin", "admin"), getAdminBlockedBuySellListings);

export default router;
