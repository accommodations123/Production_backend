import sequelize from "../../config/db.js";
import { getCache, setCache } from "../../services/cacheService.js";
export const getEventAnalyticsSummary = async (req, res) => {
  try {
    const cacheKey = "analytics:event:summary";
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
      WHERE event_type IN (
        'EVENT_DRAFT_CREATED',
        'EVENT_SUBMITTED',
        'EVENT_APPROVED',
        'EVENT_REJECTED',
        'EVENT_DELETED'
      )
    `);

    const response = { success: true, stats: rows[0] };
    await setCache(cacheKey, response, 300);
    return res.json(response);

  } catch (err) {
    console.error("EVENT ANALYTICS SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const getEventEngagementTimeseries = async (req, res) => {
  try {
    const { eventId, type = "EVENT_JOINED", days = 30 } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - Number(days));

    const [rows] = await sequelize.query(
      `
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total
      FROM analytics_events
      WHERE event_type = :type
        AND event_id = :eventId
        AND created_at >= :since
      GROUP BY day
      ORDER BY day ASC
      `,
      {
        replacements: {
          type,
          eventId,
          since
        }
      }
    );

    return res.json({
      labels: rows.map(r => r.day),
      values: rows.map(r => Number(r.total))
    });

  } catch (err) {
    console.error("EVENT ENGAGEMENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const getEventAnalyticsByLocation = async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT country, state, COUNT(*) AS total
      FROM analytics_events
      WHERE event_type IN ('EVENT_JOINED', 'EVENT_VIEWED')
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
