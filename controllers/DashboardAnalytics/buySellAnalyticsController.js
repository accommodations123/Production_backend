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
   BUY / SELL – OVERVIEW COUNTS
   ===================================================== */
export const getBuySellOverview = async (req, res) => {
  try {
    const { range = "7d" } = req.query;
    const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["BUYSELL_LISTING_APPROVED", "BUYSELL_LISTING_BLOCKED"])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const stats = countByField(filtered, "event_type");

    return res.json({ success: true, range, stats });
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

    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["BUYSELL_LISTING_APPROVED", "BUYSELL_LISTING_BLOCKED"])
      .exec();

    const filtered = events.filter(e => new Date(e.created_at) >= fromDate);
    const trend = dailyTrend(filtered, ["BUYSELL_LISTING_APPROVED", "BUYSELL_LISTING_BLOCKED"]);

    return res.json({ success: true, trend });
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
    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("BUYSELL_LISTING_APPROVED")
      .exec();

    const data = countByField(events, "country");
    return res.json({ success: true, data });
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
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["BUYSELL_LISTING_APPROVED", "BUYSELL_LISTING_BLOCKED"])
      .exec();

    const stats = countByField(events, "event_type");
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("BUYSELL RATIO ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
