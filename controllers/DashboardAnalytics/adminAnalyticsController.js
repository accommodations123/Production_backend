import sequelize from "../../config/db.js";
import { getCache, setCache } from "../../services/cacheService.js";

/* =========================================================
   ANALYTICS SUMMARY (LAST 30 DAYS)
========================================================= */
export const getAnalyticsSummary = async (req, res) => {
  try {
    const cacheKey = "analytics:summary:30d";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const [rows] = await sequelize.query(`
      SELECT
        SUM(CASE WHEN event_type = 'HOST_CREATED' THEN 1 ELSE 0 END) AS host_created,
        SUM(CASE WHEN event_type = 'HOST_APPROVED' THEN 1 ELSE 0 END) AS host_approved,
        SUM(CASE WHEN event_type = 'HOST_REJECTED' THEN 1 ELSE 0 END) AS host_rejected,

        SUM(CASE WHEN event_type = 'PROPERTY_DRAFT_CREATED' THEN 1 ELSE 0 END) AS property_draft,
        SUM(CASE WHEN event_type = 'PROPERTY_SUBMITTED' THEN 1 ELSE 0 END) AS property_submitted,
        SUM(CASE WHEN event_type = 'PROPERTY_APPROVED' THEN 1 ELSE 0 END) AS property_approved,
        SUM(CASE WHEN event_type = 'PROPERTY_REJECTED' THEN 1 ELSE 0 END) AS property_rejected
      FROM analytics_events
      WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY
    `);

    const d = rows[0];

    const response = {
      hosts: {
        created: Number(d.host_created || 0),
        approved: Number(d.host_approved || 0),
        rejected: Number(d.host_rejected || 0)
      },
      properties: {
        drafted: Number(d.property_draft || 0),
        submitted: Number(d.property_submitted || 0),
        approved: Number(d.property_approved || 0),
        rejected: Number(d.property_rejected || 0)
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

    const since = new Date(Date.now() - days * 86400000);

    const [rows] = await sequelize.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = :event
        AND created_at >= :since
      GROUP BY day
      ORDER BY day ASC
    `, { replacements: { event, since } });

    const map = new Map(rows.map(r => [r.day, Number(r.total)]));

    const labels = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);

      labels.push(key);
      values.push(map.get(key) || 0);
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

    const [rows] = await sequelize.query(`
      SELECT country, state, COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = :event
        AND country IS NOT NULL
      GROUP BY country, state
      ORDER BY count DESC
      LIMIT 20
    `, { replacements: { event } });

    await setCache(cacheKey, rows, 600);
    return res.json(rows);

  } catch (err) {
    console.error("ANALYTICS GEO ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
