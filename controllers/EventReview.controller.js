import EventReview from "../model/EventReview.js";
import Event from "../model/Events.models.js";
import sequelize from "../config/db.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

/* =====================================================
   ADD / CREATE REVIEW
===================================================== */
export const addEventReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const { reviewer_name, rating, comment } = req.body;

    if (!reviewer_name || !rating || !comment) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Reviewer name, rating, and comment are required"
      });
    }

    if (rating < 1 || rating > 5) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const existingReview = await EventReview.findOne({
      where: { event_id: eventId, user_id: userId }
    });

    if (existingReview) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this event"
      });
    }

    await EventReview.create(
      {
        event_id: eventId,
        user_id: userId,
        reviewer_name,
        rating,
        comment,
        status: "active"
      },
      { transaction }
    );

    // Aggregate rating (ACTIVE reviews only)
    const stats = await EventReview.findOne({
      where: { event_id: eventId, status: "active" },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalReviews"]
      ],
      raw: true
    });

    const ratingData = {
      avgRating: Number(stats.avgRating || 0).toFixed(1),
      totalReviews: Number(stats.totalReviews || 0)
    };

    await event.update({ rating: ratingData.avgRating }, { transaction });

    await transaction.commit();

    // Invalidate Redis
    await deleteCache(`event:${eventId}:reviews`);
    await deleteCache(`event:${eventId}:rating`);

    return res.status(201).json({
      success: true,
      message: "Review added successfully"
    });

  } catch (error) {
    await transaction.rollback();
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

    const reviews = await EventReview.findAll({
      where: {
        event_id: eventId,
        status: "active"
      },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "reviewer_name",
        "rating",
        "comment",
        "created_at"
      ]
    });

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

    const stats = await EventReview.findOne({
      where: { event_id: eventId, status: "active" },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalReviews"]
      ],
      raw: true
    });

    const ratingData = {
      avgRating: Number(stats.avgRating || 0).toFixed(1),
      totalReviews: Number(stats.totalReviews || 0)
    };

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

    const review = await EventReview.findOne({
      where: {
        id: reviewId,
        user_id: userId,
        status: "active"
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    await review.update({ status: "hidden" });

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
    const reviews = await EventReview.findAll({
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "event_id",
        "reviewer_name",
        "rating",
        "comment",
        "status",
        "created_at"
      ],
      include: [
        {
          model: Event,
          attributes: ["id", "title"]
        }
      ]
    });

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
