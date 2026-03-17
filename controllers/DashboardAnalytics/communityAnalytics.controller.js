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

function dailyTrend(events, eventTypes) {
  const map = {};
  for (const e of events) {
    if (!eventTypes.includes(e.event_type)) continue;
    const date = (e.created_at || "").substring(0, 10);
    const key = `${date}:${e.event_type}`;
    if (!map[key]) map[key] = { date, event_type: e.event_type, count: 0 };
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

/* =====================================================
   COMMUNITY – OVERVIEW COUNTS
   ===================================================== */
export const getCommunityOverview = async (req, res) => {
  try {
    const { range = "7d" } = req.query;
    const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["COMMUNITY_CREATED", "COMMUNITY_APPROVED", "COMMUNITY_REJECTED", "COMMUNITY_SUSPENDED"])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const stats = countByField(filtered, "event_type");

    return res.json({ success: true, range, stats });
  } catch (err) {
    console.error("COMMUNITY OVERVIEW ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – DAILY TREND
   ===================================================== */
export const getCommunityDailyTrend = async (req, res) => {
  try {
    const { range = "7d" } = req.query;
    const days = range === "30d" ? 30 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["COMMUNITY_CREATED", "COMMUNITY_APPROVED", "COMMUNITY_REJECTED"])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const trend = dailyTrend(filtered, ["COMMUNITY_CREATED", "COMMUNITY_APPROVED", "COMMUNITY_REJECTED"]);

    return res.json({ success: true, trend });
  } catch (err) {
    console.error("COMMUNITY TREND ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – COUNTRY DISTRIBUTION
   ===================================================== */
export const getCommunityByCountry = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("COMMUNITY_CREATED")
      .exec();

    const filtered = events.filter(e => e.country != null);
    const data = countByField(filtered, "country");

    return res.json({ success: true, data });
  } catch (err) {
    console.error("COMMUNITY COUNTRY ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – APPROVAL VS REJECTION
   ===================================================== */
export const getCommunityApprovalRatio = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["COMMUNITY_APPROVED", "COMMUNITY_REJECTED"])
      .exec();

    const stats = countByField(events, "event_type");
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("COMMUNITY RATIO ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

/* =====================================================
   COMMUNITY – MEMBERSHIP ACTIVITY
   ===================================================== */
export const getCommunityMembershipActivity = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["COMMUNITY_JOINED", "COMMUNITY_LEFT"])
      .exec();

    const stats = countByField(events, "event_type");
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("COMMUNITY MEMBERSHIP ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
