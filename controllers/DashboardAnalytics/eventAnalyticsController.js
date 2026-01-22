import sequelize from "../../config/db.js";
import { getCache, setCache } from "../../services/cacheService.js";
/* =========================================================
   EVENT ANALYTICS SUMMARY (LAST 30 DAYS)
========================================================= */
export const getEventAnalyticsSummary = async (req, res) => {
  try {
    const cacheKey = "analytics:event:summary:30d";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const [rows] = await sequelize.query(`
      SELECT
        SUM(CASE WHEN event_type = 'EVENT_DRAFT_CREATED' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN event_type = 'EVENT_SUBMITTED' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN event_type = 'EVENT_APPROVED' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN event_type = 'EVENT_REJECTED' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN event_type = 'EVENT_DELETED' THEN 1 ELSE 0 END) AS deleted
      FROM analytics_events
      WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY
    `);

    const response = { success: true, stats: rows[0] };
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
    const since = new Date(Date.now() - Number(days) * 86400000);

    const [rows] = await sequelize.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = :type
        AND created_at >= :since
      GROUP BY day
      ORDER BY day ASC
    `, { replacements: { type, since } });

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
    const [rows] = await sequelize.query(`
      SELECT country, state, COUNT(*) AS total
      FROM analytics_events
      WHERE event_type IN ('EVENT_JOINED', 'EVENT_VIEWED')
        AND country IS NOT NULL
      GROUP BY country, state
      ORDER BY total DESC
      LIMIT 20
    `);

    return res.json(rows);

  } catch (err) {
    console.error("EVENT GEO ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
