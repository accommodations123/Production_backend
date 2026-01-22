import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { Op, fn, col, literal } from "sequelize";

/* =====================================================
   COMMUNITY – OVERVIEW COUNTS
   ===================================================== */
export const getCommunityOverview = async (req, res) => {
  try {
    const { range = "7d" } = req.query;

    const days =
      range === "30d" ? 30 :
      range === "90d" ? 90 :
      7;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const stats = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "COMMUNITY_CREATED",
            "COMMUNITY_APPROVED",
            "COMMUNITY_REJECTED",
            "COMMUNITY_SUSPENDED"
          ]
        },
        created_at: {
          [Op.gte]: fromDate
        }
      },
      group: ["event_type"]
    });

    return res.json({
      success: true,
      range,
      stats
    });

  } catch (err) {
    console.error("COMMUNITY OVERVIEW ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – DAILY TREND
   ===================================================== */
export const getCommunityDailyTrend = async (req, res) => {
  try {
    const { range = "7d" } = req.query;

    const days = range === "30d" ? 30 : 7;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const trend = await AnalyticsEvent.findAll({
      attributes: [
        [fn("DATE", col("created_at")), "date"],
        "event_type",
        [fn("COUNT", col("id")), "count"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "COMMUNITY_CREATED",
            "COMMUNITY_APPROVED",
            "COMMUNITY_REJECTED"
          ]
        },
        created_at: {
          [Op.gte]: fromDate
        }
      },
      group: [
        literal("DATE(created_at)"),
        "event_type"
      ],
      order: [[literal("DATE(created_at)"), "ASC"]]
    });

    return res.json({
      success: true,
      trend
    });

  } catch (err) {
    console.error("COMMUNITY TREND ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – COUNTRY DISTRIBUTION
   ===================================================== */
export const getCommunityByCountry = async (req, res) => {
  try {
    const data = await AnalyticsEvent.findAll({
      attributes: [
        "country",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: "COMMUNITY_CREATED",
        country: { [Op.ne]: null }
      },
      group: ["country"],
      order: [[literal("total"), "DESC"]]
    });

    return res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("COMMUNITY COUNTRY ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – APPROVAL VS REJECTION
   ===================================================== */
export const getCommunityApprovalRatio = async (req, res) => {
  try {
    const stats = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "COMMUNITY_APPROVED",
            "COMMUNITY_REJECTED"
          ]
        }
      },
      group: ["event_type"]
    });

    return res.json({
      success: true,
      stats
    });

  } catch (err) {
    console.error("COMMUNITY RATIO ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – MEMBERSHIP ACTIVITY
   ===================================================== */
export const getCommunityMembershipActivity = async (req, res) => {
  try {
    const stats = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "COMMUNITY_JOINED",
            "COMMUNITY_LEFT"
          ]
        }
      },
      group: ["event_type"]
    });

    return res.json({
      success: true,
      stats
    });

  } catch (err) {
    console.error("COMMUNITY MEMBERSHIP ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
