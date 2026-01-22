import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";


export const trackCommunityEvent = async ({
  event_type,
  user_id = null,
  community = null,
  country = null,
  state = null,
  metadata = {}
}) => {
  try {
    await AnalyticsEvent.create({
      event_type,
      user_id,
      country: country ?? community?.country ?? null,
      state: state ?? community?.state ?? null,
      metadata: {
        ...metadata,
        community_id: community?.id
      }
    });
  } catch (err) {
    console.error("ANALYTICS ERROR:", err.message);
  }
};

