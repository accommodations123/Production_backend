import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";


export async function trackCommunityEvent({
  event_type,
  user_id,
  community_id,
  country = null,
  state = null,
  metadata = {}
}) {
  if (!event_type || !user_id || !community_id) return;

  return AnalyticsEvent.create({
    event_type,
    user_id,
    community_id,
    country,
    state,
    metadata
  });
}
