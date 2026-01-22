import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { Op, fn, col, literal } from "sequelize";

/* =====================================================
   BUY / SELL – OVERVIEW COUNTS
   ===================================================== */
export const getBuySellOverview = async (req, res) => {
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
            "BUYSELL_LISTING_APPROVED",
            "BUYSELL_LISTING_BLOCKED"
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
    console.error("BUYSELL OVERVIEW ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   BUY / SELL – DAILY TREND
   ===================================================== */
export const getBuySellDailyTrend = async (req, res) => {
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
            "BUYSELL_LISTING_APPROVED",
            "BUYSELL_LISTING_BLOCKED"
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
    console.error("BUYSELL TREND ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   BUY / SELL – COUNTRY DISTRIBUTION
   ===================================================== */
export const getBuySellByCountry = async (req, res) => {
  try {
    const data = await AnalyticsEvent.findAll({
      attributes: [
        "country",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: "BUYSELL_LISTING_APPROVED"
      },
      group: ["country"],
      order: [[literal("total"), "DESC"]]
    });

    return res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error("BUYSELL COUNTRY ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   BUY / SELL – APPROVAL VS BLOCK
   ===================================================== */
export const getBuySellApprovalRatio = async (req, res) => {
  try {
    const stats = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "total"]
      ],
      where: {
        event_type: {
          [Op.in]: [
            "BUYSELL_LISTING_APPROVED",
            "BUYSELL_LISTING_BLOCKED"
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
    console.error("BUYSELL RATIO ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
