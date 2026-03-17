// controllers/DashboardAnalytics/carrerAnalytics.controller.js
import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";

/* ── HELPERS ─────────────────────────────────────────────────── */
function countByField(events, field) {
  const map = {};
  for (const e of events) {
    const key = e[field] || "unknown";
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([k, total]) => ({ [field]: k, total }))
    .sort((a, b) => b.total - a.total);
}

function dailyTrend(events) {
  const map = {};
  for (const e of events) {
    const date = (e.created_at || "").substring(0, 10);
    map[date] = (map[date] || 0) + 1;
  }
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* =====================================================
   📊 JOBS – OVERVIEW
   ===================================================== */
export const getJobsOverview = async (req, res) => {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["JOB_CREATED", "JOB_VIEWED", "JOB_STATUS_CHANGED"])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const stats = countByField(filtered, "event_type");

    res.json({ success: true, stats });
  } catch (err) {
    console.error("JOBS OVERVIEW ERROR:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   📊 APPLICATION FUNNEL (TRANSITIONS)
   ===================================================== */
export const getApplicationsFunnel = async (req, res) => {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("APPLICATION_STATUS_CHANGED")
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);

    // Group by metadata.to status
    const funnelMap = {};
    for (const e of filtered) {
      const status = e.metadata?.to || "unknown";
      funnelMap[status] = (funnelMap[status] || 0) + 1;
    }

    const funnel = Object.entries(funnelMap)
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total);

    res.json({ success: true, funnel });
  } catch (err) {
    console.error("APPLICATION FUNNEL ERROR:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   📈 APPLICATIONS – DAILY TREND
   ===================================================== */
export const getApplicationsDailyTrend = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("JOB_APPLICATION_SUBMITTED")
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const trend = dailyTrend(filtered);

    res.json({ success: true, trend });
  } catch (err) {
    console.error("APPLICATION TREND ERROR:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   👀 JOB VIEWS – TOP JOBS
   ===================================================== */
export const getMostViewedJobs = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("JOB_VIEWED")
      .exec();

    // Group by event_id (job_id) + count
    const viewsMap = {};
    for (const e of events) {
      if (e.event_id) {
        viewsMap[e.event_id] = (viewsMap[e.event_id] || 0) + 1;
      }
    }

    const data = Object.entries(viewsMap)
      .map(([job_id, views]) => ({ job_id, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    res.json({ success: true, data });
  } catch (err) {
    console.error("JOB VIEWS ERROR:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   🔔 ADMIN ACTIONS – AUDIT SUMMARY
   ===================================================== */
export const getAdminActionsSummary = async (req, res) => {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in([
        "JOB_CREATED",
        "JOB_STATUS_CHANGED",
        "APPLICATION_STATUS_CHANGED",
        "APPLICATION_USER_NOTIFIED"
      ])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const stats = countByField(filtered, "event_type");

    res.json({ success: true, stats });
  } catch (err) {
    console.error("ADMIN ACTIONS ERROR:", err);
    res.status(500).json({ message: "Analytics error" });
  }
};
