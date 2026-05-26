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

      user_id: actor.user_id || undefined,
      host_id: actor.host_id || undefined,

      property_id:
        entity.type === "property" ? entity.id : undefined,

      event_id:
        entity.type && entity.type !== "property"
          ? entity.id
          : undefined,

      country: location.country || undefined,
      state: location.state || undefined,

      metadata
    });
  } catch (err) {
    console.error("❌ ANALYTICS_FAILED:", err);
  }
};
