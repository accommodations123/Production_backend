import express from "express";
import userauth from "../middleware/userAuth.js";
import {
  addEventReview,
  getEventReviews,
  deleteMyReview,
  getAllEventReviews
} from "../controllers/EventReview.controller.js";

const router = express.Router();

router.post("/:id/reviews", userauth, addEventReview);
router.get("/:id/reviews", getEventReviews);
router.delete("/reviews/:reviewId", userauth, deleteMyReview);
router.get("/reviews/all", getAllEventReviews);


export default router;
