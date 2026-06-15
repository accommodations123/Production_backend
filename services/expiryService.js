import TravelTrip from "../model/travel/TravelTrip.js";
import Property from "../model/Property.js";
import Event from "../model/Events.models.js";
import Job from "../model/carrer/Job.js";
import { isExpiredUTC } from "../utils/dateTimeUtils.js";
import { deleteCacheByPrefix, getRedisClient, getRedisConnected } from "./cacheService.js";

export const runExpiryChecks = async () => {
  // ── Redis Distributed Lock (prevents concurrent cron runs across multiple instances) ──
  const lockKey = "lock:cron:expiry_checks";
  const lockTtl = 240; // 4 minutes (cron runs every 5 minutes)
  let hasLock = false;

  const isRedisConnected = getRedisConnected();
  const redisClient = getRedisClient();

  if (isRedisConnected && redisClient) {
    try {
      const result = await redisClient.set(lockKey, "locked", "EX", lockTtl, "NX");
      if (result !== "OK") {
        console.log("[Expiry Worker] Expiry check bypassed: locked by another instance.");
        return;
      }
      hasLock = true;
      console.log("[Expiry Worker] Acquired distributed lock.");
    } catch (lockErr) {
      console.warn("[Expiry Worker] Failed to acquire Redis lock, proceeding anyway:", lockErr.message);
    }
  }

  try {
    const now = Date.now();

    // 1. Expire Travel Trips (Paginated)
    let tripsLastKey = null;
    let tripsUpdated = false;
    do {
      let query = TravelTrip.query("status").eq("approved").limit(100);
      if (tripsLastKey) query = query.startAt(tripsLastKey);

      const batch = await query.exec();
      tripsLastKey = batch.lastKey;

      const expiredTrips = batch.filter(trip =>
        isExpiredUTC(trip.travel_date, trip.departure_time)
      );

      if (expiredTrips.length > 0) {
        console.log(`[Expiry Worker] Found ${expiredTrips.length} expired travel trips in batch. Updating status to "expired"...`);
        await Promise.all(expiredTrips.map(trip =>
          TravelTrip.update({ id: trip.id }, { status: "expired" })
        ));
        tripsUpdated = true;
      }
    } while (tripsLastKey);

    if (tripsUpdated) {
      await deleteCacheByPrefix("travel:");
    }

    // 2. Expire Properties (Paginated)
    let propsLastKey = null;
    let propsUpdated = false;
    do {
      let query = Property.query("status").eq("approved").limit(100);
      if (propsLastKey) query = query.startAt(propsLastKey);

      const batch = await query.exec();
      propsLastKey = batch.lastKey;

      const expiredProperties = batch.filter(p =>
        !p.is_expired && p.listing_expires_at && new Date(p.listing_expires_at).getTime() < now
      );

      if (expiredProperties.length > 0) {
        console.log(`[Expiry Worker] Found ${expiredProperties.length} expired property listings in batch. Updating is_expired to true...`);
        await Promise.all(expiredProperties.map(p =>
          Property.update({ id: p.id }, { is_expired: true })
        ));
        propsUpdated = true;
      }
    } while (propsLastKey);

    if (propsUpdated) {
      await deleteCacheByPrefix("approved_listings:");
      await deleteCacheByPrefix("all_properties:");
    }

    // 3. Expire Events (Paginated)
    let eventsLastKey = null;
    let eventsUpdated = false;
    do {
      let query = Event.query("status").eq("approved").limit(100);
      if (eventsLastKey) query = query.startAt(eventsLastKey);

      const batch = await query.exec();
      eventsLastKey = batch.lastKey;

      const expiredEvents = batch.filter(event => {
        const targetDate = event.end_date || event.start_date;
        const targetTime = event.end_time || event.start_time;
        return isExpiredUTC(targetDate, targetTime);
      });

      if (expiredEvents.length > 0) {
        console.log(`[Expiry Worker] Found ${expiredEvents.length} expired events in batch. Updating status to "expired"...`);
        await Promise.all(expiredEvents.map(event =>
          Event.update({ id: event.id }, { status: "expired" })
        ));
        eventsUpdated = true;
      }
    } while (eventsLastKey);

    if (eventsUpdated) {
      await deleteCacheByPrefix("approved_events:");
      await deleteCacheByPrefix("event:");
    }

    // 4. Expire Careers/Jobs (Paginated)
    let jobsLastKey = null;
    let jobsUpdated = false;
    do {
      let query = Job.query("status").eq("active").limit(100);
      if (jobsLastKey) query = query.startAt(jobsLastKey);

      const batch = await query.exec();
      jobsLastKey = batch.lastKey;

      const expiredJobs = batch.filter(job => {
        const deadline = job.metadata?.deadline || job.metadata?.application_deadline || job.deadline;
        return deadline && isExpiredUTC(deadline);
      });

      if (expiredJobs.length > 0) {
        console.log(`[Expiry Worker] Found ${expiredJobs.length} expired jobs in batch. Updating status to "closed"...`);
        await Promise.all(expiredJobs.map(job =>
          Job.update({ id: job.id }, { status: "closed" })
        ));
        jobsUpdated = true;
      }
    } while (jobsLastKey);

    if (jobsUpdated) {
      await deleteCacheByPrefix("jobs:");
    }

  } catch (err) {
    console.error("[Expiry Worker] Expiry check failed with error:", err);
  }
};
