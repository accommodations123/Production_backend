import EventReview from "../model/EventReview.js";
import Event from "../model/Events.models.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

/* =====================================================
   ADD / CREATE REVIEW
===================================================== */
export const addEventReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const { reviewer_name, rating, comment } = req.body;

    if (!reviewer_name || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Reviewer name, rating, and comment are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    const event = await Event.get(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check existing review via GSI
    const existingReviews = await EventReview.query("event_id").eq(eventId).exec();
    const existingReview = existingReviews.find(r => r.user_id === userId);

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this event"
      });
    }

    await EventReview.create({
      event_id: eventId,
      user_id: userId,
      reviewer_name,
      rating,
      comment,
      status: "active"
    });

    // Aggregate rating (ACTIVE reviews only)
    const activeReviews = existingReviews.filter(r => r.status === "active");
    // Include the new review
    activeReviews.push({ rating });
    
    const totalReviews = activeReviews.length;
    const avgRating = totalReviews > 0
      ? (activeReviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews).toFixed(1)
      : "0.0";

    await Event.update({ id: eventId }, { rating: avgRating });

    // Invalidate Redis
    await deleteCache(`event:${eventId}:reviews`);
    await deleteCache(`event:${eventId}:rating`);

    return res.status(201).json({
      success: true,
      message: "Review added successfully"
    });

  } catch (error) {
    console.error("ADD REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =====================================================
   GET REVIEWS FOR EVENT (PUBLIC + REDIS)
===================================================== */
export const getEventReviews = async (req, res) => {
  try {
    const eventId = req.params.id;
    const cacheKey = `event:${eventId}:reviews`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        reviews: cached,
        cached: true
      });
    }

    // Query by event_id GSI
    const allReviews = await EventReview.query("event_id").eq(eventId).exec();
    
    // Filter active + sort + select fields
    const reviews = allReviews
      .filter(r => r.status === "active")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(r => ({
        id: r.id,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at
      }));

    await setCache(cacheKey, reviews, 600); // 10 minutes

    return res.json({
      success: true,
      reviews,
      cached: false
    });

  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =====================================================
   GET EVENT RATING (AGGREGATION + REDIS)
===================================================== */
export const getEventRating = async (req, res) => {
  try {
    const eventId = req.params.id;
    const cacheKey = `event:${eventId}:rating`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        rating: cached,
        cached: true
      });
    }

    // Client-side aggregation
    const allReviews = await EventReview.query("event_id").eq(eventId).exec();
    const activeReviews = allReviews.filter(r => r.status === "active");

    const totalReviews = activeReviews.length;
    const avgRating = totalReviews > 0
      ? (activeReviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews).toFixed(1)
      : "0.0";

    const ratingData = { avgRating, totalReviews };

    await setCache(cacheKey, ratingData, 1800); // 30 minutes

    return res.json({
      success: true,
      rating: ratingData,
      cached: false
    });

  } catch (error) {
    console.error("GET RATING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =====================================================
   HIDE MY REVIEW (SAFE DELETE)
===================================================== */
export const hideMyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const reviewId = req.params.reviewId;

    const review = await EventReview.get(reviewId);

    if (!review || review.user_id !== userId || review.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    await EventReview.update({ id: reviewId }, { status: "hidden" });

    await deleteCache(`event:${review.event_id}:reviews`);
    await deleteCache(`event:${review.event_id}:rating`);

    return res.json({
      success: true,
      message: "Review hidden successfully"
    });

  } catch (error) {
    console.error("HIDE REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* =====================================================
   GET ALL REVIEWS (ADMIN)
===================================================== */
export const getAllEventReviews = async (req, res) => {
  try {
    // Scan all reviews (admin view)
    const allReviews = await EventReview.scan().exec();

    // Sort by created_at DESC
    allReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch event details for each review
    const reviews = await Promise.all(
      allReviews.map(async (r) => {
        const event = await Event.get(r.event_id);
        return {
          id: r.id,
          event_id: r.event_id,
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          comment: r.comment,
          status: r.status,
          created_at: r.created_at,
          Event: event ? { id: event.id, title: event.title } : null
        };
      })
    );

    return res.json({
      success: true,
      reviews
    });

  } catch (error) {
    console.error("GET ALL REVIEWS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
