import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { Op, fn, col, literal } from "sequelize";

/* =====================================================
   TRAVEL – OVERVIEW
===================================================== */
export const getTravelOverview = async (req, res) => {
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
            "TRAVEL_TRIP_CREATED",
            "TRAVEL_MATCH_REQUESTED",
            "TRAVEL_MATCH_ACCEPTED",
            "TRAVEL_MATCH_REJECTED",
            "TRAVEL_MATCH_CANCELLED",
            "ADMIN_CANCELLED_TRIP"
          ]
        },
        created_at: { [Op.gte]: fromDate }
      },
      group: ["event_type"]
    });

    return res.json({ success: true, range, stats });
  } catch (err) {
    console.error("TRAVEL OVERVIEW ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   TRAVEL – DAILY TREND
===================================================== */
export const getTravelDailyTrend = async (req, res) => {
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
            "TRAVEL_TRIP_CREATED",
            "TRAVEL_MATCH_REQUESTED",
            "TRAVEL_MATCH_ACCEPTED"
          ]
        },
        created_at: { [Op.gte]: fromDate }
      },
      group: [
        literal("DATE(created_at)"),
        "event_type"
      ],
      order: [[literal("DATE(created_at)"), "ASC"]]
    });

    return res.json({ success: true, trend });
  } catch (err) {
    console.error("TRAVEL TREND ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   TRAVEL – COUNTRY DISTRIBUTION
===================================================== */
export const getTravelByCountry = async (req, res) => {
  try {
    const data = await AnalyticsEvent.findAll({
      attributes: [
        "country",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: "TRAVEL_TRIP_CREATED"
      },
      group: ["country"],
      order: [[literal("total"), "DESC"]]
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("TRAVEL COUNTRY ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   TRAVEL – MATCH CONVERSION
===================================================== */
export const getTravelMatchConversion = async (req, res) => {
  try {
    const stats = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "TRAVEL_MATCH_REQUESTED",
            "TRAVEL_MATCH_ACCEPTED",
            "TRAVEL_MATCH_REJECTED"
          ]
        }
      },
      group: ["event_type"]
    });

    return res.json({ success: true, stats });
  } catch (err) {
    console.error("TRAVEL CONVERSION ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
