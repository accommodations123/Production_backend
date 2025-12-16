import EventReview from "../model/EventReview.js";
import Event from "../model/Event.js";
import sequelize from "../config/db.js";

/* =====================================================
   ADD / CREATE REVIEW
===================================================== */
export const addEventReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const { reviewer_name, rating, comment } = req.body;

    // Basic validation
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

    // Check event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Prevent duplicate review by same user
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

    // Create review
    await EventReview.create({
      event_id: eventId,
      user_id: userId,
      reviewer_name,
      rating,
      comment
    }, { transaction });

    // Recalculate average rating
    const stats = await EventReview.findAll({
      where: { event_id: eventId },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"]
      ],
      raw: true
    });

    const avgRating = Number(stats[0].avgRating || 0).toFixed(1);

    await event.update({ rating: avgRating }, { transaction });

    await transaction.commit();

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
   GET REVIEWS FOR EVENT
===================================================== */
export const getEventReviews = async (req, res) => {
  try {
    const eventId = req.params.id;

    const reviews = await EventReview.findAll({
      where: { event_id: eventId },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "reviewer_name",
        "rating",
        "comment",
        "created_at"
      ]
    });

    return res.json({
      success: true,
      reviews
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
   DELETE REVIEW (USER)
===================================================== */
export const deleteMyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const reviewId = req.params.reviewId;

    const review = await EventReview.findOne({
      where: { id: reviewId, user_id: userId }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    await review.destroy();

    return res.json({
      success: true,
      message: "Review deleted"
    });

  } catch (error) {
    console.error("DELETE REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET ALL EVENT REVIEWS (PUBLIC)
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

