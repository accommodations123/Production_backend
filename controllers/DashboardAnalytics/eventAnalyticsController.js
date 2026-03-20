import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { getCache, setCache } from "../../services/cacheService.js";

/* =========================================================
   EVENT ANALYTICS SUMMARY (LAST 30 DAYS)
========================================================= */
export const getEventAnalyticsSummary = async (req, res) => {
  try {
    const cacheKey = "analytics:event:summary:30d";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in([
        "EVENT_DRAFT_CREATED",
        "EVENT_SUBMITTED",
        "EVENT_APPROVED",
        "EVENT_REJECTED",
        "EVENT_DELETED"
      ])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);

    // Client-side aggregation
    const counts = {};
    for (const e of filtered) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }

    const stats = {
      drafts:    counts.EVENT_DRAFT_CREATED || 0,
      submitted: counts.EVENT_SUBMITTED     || 0,
      approved:  counts.EVENT_APPROVED      || 0,
      rejected:  counts.EVENT_REJECTED      || 0,
      deleted:   counts.EVENT_DELETED       || 0
    };

    const response = { success: true, stats };
    await setCache(cacheKey, response, 300);
    return res.json(response);

  } catch (err) {
    console.error("EVENT ANALYTICS SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   EVENT ENGAGEMENT TIMESERIES (GAPLESS)
========================================================= */
export const getEventEngagementTimeseries = async (req, res) => {
  try {
    const { type = "EVENT_JOINED", days = 30 } = req.query;
    const numDays = Number(days);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - numDays);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq(type)
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

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);

      labels.push(key);
      values.push(map[key] || 0);
    }

    return res.json({ labels, values });

  } catch (err) {
    console.error("EVENT ENGAGEMENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   EVENT GEO ANALYTICS
========================================================= */
export const getEventAnalyticsByLocation = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["EVENT_JOINED", "EVENT_VIEWED"])
      .exec();

    // Client-side GROUP BY country, state + COUNT
    const geoMap = {};
    for (const e of events) {
      if (!e.country) continue;
      const key = `${e.country}||${e.state || ""}`;
      if (!geoMap[key]) geoMap[key] = { country: e.country, state: e.state || null, total: 0 };
      geoMap[key].total++;
    }

    const rows = Object.values(geoMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    return res.json(rows);

  } catch (err) {
    console.error("EVENT GEO ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
