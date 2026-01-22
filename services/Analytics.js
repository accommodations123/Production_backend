import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";

export const trackEvent = async ({
  event_type,
  actor = {},        // { user_id, host_id }
  entity = {},       // { type, id }
  location = {},     // { country, state }
  metadata = {}
}) => {
  try {
    if (!event_type) return;

    await AnalyticsEvent.create({
      event_type,

      user_id: actor.user_id || null,
      host_id: actor.host_id || null,

      property_id:
        entity.type === "property" ? entity.id : null,

      event_id:
        entity.type && entity.type !== "property"
          ? entity.id
          : null,

      country: location.country || null,
      state: location.state || null,

      metadata
    });
  } catch (err) {
    console.error("❌ ANALYTICS_FAILED:", err);
  }
};
