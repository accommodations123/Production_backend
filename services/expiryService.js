import TravelTrip from "../model/travel/TravelTrip.js";
import Property from "../model/Property.js";
import Event from "../model/Events.models.js";
import Job from "../model/carrer/Job.js";
import { isExpiredUTC } from "../utils/dateTimeUtils.js";
import { deleteCacheByPrefix } from "./cacheService.js";

export const runExpiryChecks = async () => {
  try {
    const now = Date.now();

    // 1. Expire Travel Trips
    const approvedTrips = await TravelTrip.query("status").eq("approved").exec();
    const expiredTrips = approvedTrips.filter(trip =>
      isExpiredUTC(trip.travel_date, trip.departure_time)
    );

    if (expiredTrips.length > 0) {
      console.log(`[Expiry Worker] Found ${expiredTrips.length} expired travel trips. Updating status to "expired"...`);
      await Promise.all(expiredTrips.map(trip =>
        TravelTrip.update({ id: trip.id }, { status: "expired" })
      ));
      await deleteCacheByPrefix("travel:");
    }

    // 2. Expire Properties
    const approvedProperties = await Property.query("status").eq("approved").exec();
    const expiredProperties = approvedProperties.filter(p =>
      !p.is_expired && p.listing_expires_at && new Date(p.listing_expires_at).getTime() < now
    );

    if (expiredProperties.length > 0) {
      console.log(`[Expiry Worker] Found ${expiredProperties.length} expired property listings. Updating is_expired to true...`);
      await Promise.all(expiredProperties.map(p =>
        Property.update({ id: p.id }, { is_expired: true })
      ));
      await deleteCacheByPrefix("approved_listings:");
      await deleteCacheByPrefix("all_properties:");
    }

    // 3. Expire Events
    const approvedEvents = await Event.query("status").eq("approved").exec();
    const expiredEvents = approvedEvents.filter(event => {
      const targetDate = event.end_date || event.start_date;
      const targetTime = event.end_time || event.start_time;
      return isExpiredUTC(targetDate, targetTime);
    });

    if (expiredEvents.length > 0) {
      console.log(`[Expiry Worker] Found ${expiredEvents.length} expired events. Updating status to "expired"...`);
      await Promise.all(expiredEvents.map(event =>
        Event.update({ id: event.id }, { status: "expired" })
      ));
      await deleteCacheByPrefix("approved_events:");
      await deleteCacheByPrefix("event:");
    }

    // 4. Expire Careers/Jobs
    const activeJobs = await Job.query("status").eq("active").exec();
    const expiredJobs = activeJobs.filter(job => {
      const deadline = job.metadata?.deadline || job.metadata?.application_deadline || job.deadline;
      return deadline && isExpiredUTC(deadline);
    });

    if (expiredJobs.length > 0) {
      console.log(`[Expiry Worker] Found ${expiredJobs.length} expired jobs. Updating status to "closed"...`);
      await Promise.all(expiredJobs.map(job =>
        Job.update({ id: job.id }, { status: "closed" })
      ));
      await deleteCacheByPrefix("jobs:");
    }

  } catch (err) {
    console.error("[Expiry Worker] Expiry check failed with error:", err);
  }
};
