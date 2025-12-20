import express from "express";
import userAuth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";

import {
  addEventReview,
  getEventReviews,
  getEventRating,
  hideMyReview,
  getAllEventReviews
} from "../controllers/EventReview.controller.js";

const router = express.Router();

/* ===============================
   USER ROUTES
================================ */

// Add review (after attending event)
router.post("/:id/reviews", userAuth, addEventReview);

// Get public reviews for an event (Redis cached)
router.get("/:id/reviews", getEventReviews);

// Get event rating + review count (Redis cached)
router.get("/:id/rating", getEventRating);

// Hide my review (SAFE DELETE)
router.patch("/reviews/:reviewId/hide", userAuth, hideMyReview);


/* ===============================
   ADMIN ROUTES
================================ */

// Get all reviews (no cache, moderation view)
router.get("/admin/all", adminAuth, getAllEventReviews);

export default router;
