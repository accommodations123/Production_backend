import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";

/* =====================================================
   👤 USERS – OVERVIEW (DynamoDB: scan + client-side aggregation)
   ===================================================== */
export const getUsersOverview = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["USER_REGISTERED", "OTP_VERIFIED", "USER_LOGIN"])
      .exec();

    // Client-side GROUP BY event_type + COUNT
    const statsMap = {};
    for (const e of events) {
      statsMap[e.event_type] = (statsMap[e.event_type] || 0) + 1;
    }

    const stats = Object.entries(statsMap).map(([event_type, total]) => ({
      event_type,
      total
    }));

    return res.json({ success: true, stats });

  } catch (err) {
    console.error("USERS OVERVIEW ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};

export const getUserSignupTrend = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Query by event_type GSI with date filter
    let events;
    try {
      events = await AnalyticsEvent.query("event_type").eq("USER_REGISTERED")
        .where("created_at").ge(fromDate.toISOString())
        .exec();
    } catch {
      // Fallback to scan if GSI range key query fails
      events = await AnalyticsEvent.scan()
        .filter("event_type").eq("USER_REGISTERED")
        .exec();
      events = events.filter(e => new Date(e.created_at) >= fromDate);
    }

    // Client-side GROUP BY date + COUNT
    const trendMap = {};
    for (const e of events) {
      const date = (e.created_at || "").substring(0, 10); // YYYY-MM-DD
      trendMap[date] = (trendMap[date] || 0) + 1;
    }

    const trend = Object.entries(trendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ success: true, trend });

  } catch (err) {
    console.error("USER SIGNUP TREND ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};


export const getOtpFunnel = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").in(["OTP_SENT", "OTP_VERIFIED", "OTP_VERIFICATION_FAILED"])
      .exec();

    const funnelMap = {};
    for (const e of events) {
      funnelMap[e.event_type] = (funnelMap[e.event_type] || 0) + 1;
    }

    const funnel = Object.entries(funnelMap).map(([event_type, total]) => ({
      event_type,
      total
    }));

    return res.json({ success: true, funnel });

  } catch (err) {
    console.error("OTP FUNNEL ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};



export const getDailyActiveUsers = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    let events;
    try {
      events = await AnalyticsEvent.query("event_type").eq("USER_LOGIN")
        .where("created_at").ge(fromDate.toISOString())
        .exec();
    } catch {
      events = await AnalyticsEvent.scan()
        .filter("event_type").eq("USER_LOGIN")
        .exec();
      events = events.filter(e => new Date(e.created_at) >= fromDate);
    }

    // Client-side GROUP BY date + COUNT DISTINCT user_id
    const dauMap = {};
    for (const e of events) {
      const date = (e.created_at || "").substring(0, 10);
      if (!dauMap[date]) dauMap[date] = new Set();
      if (e.user_id) dauMap[date].add(e.user_id);
    }

    const data = Object.entries(dauMap)
      .map(([date, users]) => ({ date, active_users: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ success: true, data });

  } catch (err) {
    console.error("DAU ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};


export const getUsersByCountry = async (req, res) => {
  try {
    const events = await AnalyticsEvent.scan()
      .filter("event_type").eq("USER_REGISTERED")
      .exec();

    // Client-side GROUP BY country + COUNT (excluding null)
    const countryMap = {};
    for (const e of events) {
      if (e.country) {
        countryMap[e.country] = (countryMap[e.country] || 0) + 1;
      }
    }

    const data = Object.entries(countryMap)
      .map(([country, total]) => ({ country, total }))
      .sort((a, b) => b.total - a.total);

    return res.json({ success: true, data });

  } catch (err) {
    console.error("USERS BY COUNTRY ERROR:", err);
    return res.status(500).json({ message: "Analytics error" });
  }
};
