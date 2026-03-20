import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { getCache, setCache } from "../../services/cacheService.js";

/* =========================================================
   ANALYTICS SUMMARY (LAST 30 DAYS)
========================================================= */
export const getAnalyticsSummary = async (req, res) => {
  try {
    const cacheKey = "analytics:summary:30d";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in([
        "HOST_CREATED", "HOST_APPROVED", "HOST_REJECTED",
        "PROPERTY_DRAFT_CREATED", "PROPERTY_SUBMITTED",
        "PROPERTY_APPROVED", "PROPERTY_REJECTED"
      ])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);

    // Client-side aggregation
    const counts = {};
    for (const e of filtered) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }

    const response = {
      hosts: {
        created:  counts.HOST_CREATED  || 0,
        approved: counts.HOST_APPROVED || 0,
        rejected: counts.HOST_REJECTED || 0
      },
      properties: {
        drafted:   counts.PROPERTY_DRAFT_CREATED || 0,
        submitted: counts.PROPERTY_SUBMITTED     || 0,
        approved:  counts.PROPERTY_APPROVED      || 0,
        rejected:  counts.PROPERTY_REJECTED      || 0
      }
    };

    await setCache(cacheKey, response, 300);
    return res.json(response);

  } catch (err) {
    console.error("ANALYTICS SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ANALYTICS TIMESERIES (GAPLESS)
========================================================= */
export const getAnalyticsTimeseries = async (req, res) => {
  try {
    const { event, range = "30d" } = req.query;

    const ALLOWED_EVENTS = new Set([
      "HOST_CREATED",
      "HOST_APPROVED",
      "HOST_REJECTED",
      "PROPERTY_DRAFT_CREATED",
      "PROPERTY_SUBMITTED",
      "PROPERTY_APPROVED",
      "PROPERTY_REJECTED"
    ]);

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return res.status(400).json({ message: "Invalid event" });
    }

    const days =
      range === "7d" ? 7 :
      range === "90d" ? 90 : 30;

    const cacheKey = `analytics:timeseries:${event}:${days}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq(event)
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);

    // Build date → count map
    const map = {};
    for (const e of filtered) {
      const day = (e.created_at || "").substring(0, 10);
      map[day] = (map[day] || 0) + 1;
    }

    // Gapless labels
    const labels = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);

      labels.push(key);
      values.push(map[key] || 0);
    }

    const response = { labels, values };
    await setCache(cacheKey, response, 300);
    return res.json(response);

  } catch (err) {
    console.error("ANALYTICS TIMESERIES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ANALYTICS BY LOCATION
========================================================= */
export const getAnalyticsByLocation = async (req, res) => {
  try {
    const { event } = req.query;

    const ALLOWED_EVENTS = new Set([
      "HOST_CREATED",
      "HOST_APPROVED",
      "PROPERTY_APPROVED",
      "PROPERTY_REJECTED",
      "EVENT_APPROVED",
      "EVENT_REJECTED"
    ]);

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return res.status(400).json({ message: "Invalid event" });
    }

    const cacheKey = `analytics:geo:${event}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq(event)
      .exec();

    // Client-side GROUP BY country, state + COUNT
    const geoMap = {};
    for (const e of events) {
      if (!e.country) continue;
      const key = `${e.country}||${e.state || ""}`;
      if (!geoMap[key]) geoMap[key] = { country: e.country, state: e.state || null, count: 0 };
      geoMap[key].count++;
    }

    const rows = Object.values(geoMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    await setCache(cacheKey, rows, 600);
    return res.json(rows);

  } catch (err) {
    console.error("ANALYTICS GEO ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
