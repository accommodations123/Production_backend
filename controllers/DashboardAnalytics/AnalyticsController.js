import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { Op, fn, col, literal } from "sequelize";

/* ======================================================
   1️⃣ GLOBAL OVERVIEW (ALL DOMAINS)
====================================================== */
export const analyticsOverview = async (req, res) => {
  try {
    const rows = await AnalyticsEvent.findAll({
      attributes: [
        "domain",
        "event_type",
        [fn("COUNT", literal("*")), "count"]
      ],
      group: ["domain", "event_type"],
      raw: true
    });

    const result = {};

    for (const r of rows) {
      if (!result[r.domain]) result[r.domain] = {};
      result[r.domain][r.event_type] = Number(r.count);
    }

    return res.json({ success: true, data: result });

  } catch (err) {
    console.error("analyticsOverview error:", err);
    return res.status(500).json({ message: "Failed to load analytics" });
  }
};

/* ======================================================
   2️⃣ DOMAIN SUMMARY
====================================================== */
export const domainSummary = async (req, res) => {
  const { domain } = req.params;

  try {
    const rows = await AnalyticsEvent.findAll({
      where: { domain },
      attributes: [
        "event_type",
        [fn("COUNT", literal("*")), "count"]
      ],
      group: ["event_type"],
      raw: true
    });

    return res.json({ success: true, domain, events: rows });

  } catch (err) {
    console.error("domainSummary error:", err);
    return res.status(500).json({ message: "Failed to load domain summary" });
  }
};

/* ======================================================
   3️⃣ TIME SERIES
====================================================== */
export const analyticsTimeSeries = async (req, res) => {
  const { domain, from, to } = req.query;

  const where = {};
  if (domain) where.domain = domain;

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(from);
    if (to) where.created_at[Op.lte] = new Date(to);
  }

  try {
    const rows = await AnalyticsEvent.findAll({
      where,
      attributes: [
        [fn("DATE", col("created_at")), "date"],
        "domain",
        "event_type",
        [fn("COUNT", literal("*")), "count"]
      ],
      group: ["date", "domain", "event_type"],
      order: [[literal("date"), "ASC"]],
      raw: true
    });

    return res.json({ success: true, data: rows });

  } catch (err) {
    console.error("analyticsTimeSeries error:", err);
    return res.status(500).json({ message: "Failed to load time series" });
  }
};

/* ======================================================
   4️⃣ FUNNEL ANALYTICS
====================================================== */
export const funnelAnalytics = async (req, res) => {
  const { domain } = req.params;

  const funnels = {
    buy_sell: [
      "BUYSELL_LISTING_CREATED",
      "BUYSELL_LISTING_APPROVED",
      "BUYSELL_LISTING_SOLD"
    ],
    travel: [
      "TRAVEL_TRIP_CREATED",
      "TRAVEL_MATCH_REQUESTED",
      "TRAVEL_MATCH_ACCEPTED"
    ],
    community: [
      "COMMUNITY_CREATED",
      "COMMUNITY_JOINED",
      "COMMUNITY_POST_CREATED"
    ]
  };

  const steps = funnels[domain];
  if (!steps) {
    return res.status(400).json({ message: "Invalid domain" });
  }

  try {
    const rows = await AnalyticsEvent.findAll({
      where: {
        domain,
        event_type: { [Op.in]: steps }
      },
      attributes: [
        "event_type",
        [fn("COUNT", literal("*")), "count"]
      ],
      group: ["event_type"],
      raw: true
    });

    const result = {};
    steps.forEach(step => (result[step] = 0));
    rows.forEach(r => (result[r.event_type] = Number(r.count)));

    return res.json({ success: true, domain, funnel: result });

  } catch (err) {
    console.error("funnelAnalytics error:", err);
    return res.status(500).json({ message: "Failed to load funnel analytics" });
  }
};

/* ======================================================
   5️⃣ GEO ANALYTICS
====================================================== */
export const geoAnalytics = async (req, res) => {
  const { domain, level = "country" } = req.query;

  const column =
    level === "state"
      ? "location_state"
      : level === "city"
      ? "location_city"
      : "location_country";

  try {
    const rows = await AnalyticsEvent.findAll({
      where: domain ? { domain } : {},
      attributes: [
        [col(column), "location"],
        [fn("COUNT", literal("*")), "count"]
      ],
      group: [column],
      order: [[literal("count"), "DESC"]],
      limit: 20,
      raw: true
    });

    return res.json({ success: true, level, data: rows });

  } catch (err) {
    console.error("geoAnalytics error:", err);
    return res.status(500).json({ message: "Failed to load geo analytics" });
  }
};
