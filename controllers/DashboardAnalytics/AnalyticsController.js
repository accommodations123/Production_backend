import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { Op, fn, col, literal } from "sequelize";

/**
 * OVERVIEW
 * Domain → Event → Count
 */
export const analyticsOverview = async (req, res) => {
  try {
    const rows = await AnalyticsEvent.findAll({
      attributes: [
        "domain",
        "event_type",
        [fn("COUNT", col("id")), "count"]
      ],
      group: ["domain", "event_type"],
      order: [["domain", "ASC"]],
      raw: true
    });

    const data = {};
    for (const r of rows) {
      if (!data[r.domain]) data[r.domain] = {};
      data[r.domain][r.event_type] = Number(r.count);
    }

    return res.json({ success: true, data });

  } catch (err) {
    console.error("analyticsOverview error:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};


/**
 * DAILY EVENTS (last N days)
 */
export const analyticsDaily = async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days || 7), 30);

    const rows = await AnalyticsEvent.findAll({
      attributes: [
        [fn("DATE", col("created_at")), "date"],
        "domain",
        [fn("COUNT", col("id")), "count"]
      ],
      where: {
        created_at: {
          [Op.gte]: literal(`NOW() - INTERVAL ${days} DAY`)
        }
      },
      group: ["date", "domain"],
      order: [[literal("date"), "ASC"]],
      raw: true
    });

    return res.json({ success: true, days, rows });

  } catch (err) {
    console.error("analyticsDaily error:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};


/**
 * TOP EVENTS (optionally filtered)
 */
export const analyticsTopEvents = async (req, res) => {
  try {
    const { domain, limit = 10 } = req.query;

    const where = {};
    if (domain) where.domain = domain;

    const rows = await AnalyticsEvent.findAll({
      attributes: [
        "event_type",
        [fn("COUNT", col("id")), "count"]
      ],
      where,
      group: ["event_type"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: Number(limit),
      raw: true
    });

    return res.json({ success: true, rows });

  } catch (err) {
    console.error("analyticsTopEvents error:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};


/**
 * GEO ANALYTICS
 */
export const analyticsByLocation = async (req, res) => {
  try {
    const { domain } = req.query;

    const where = {};
    if (domain) where.domain = domain;

    const rows = await AnalyticsEvent.findAll({
      attributes: [
        "country",
        "state",
        [fn("COUNT", col("id")), "count"]
      ],
      where,
      group: ["country", "state"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      raw: true
    });

    return res.json({ success: true, rows });

  } catch (err) {
    console.error("analyticsByLocation error:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
