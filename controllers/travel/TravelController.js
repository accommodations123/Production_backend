import TravelTrip from "../../model/travel/TravelTrip.js";
import Host from "../../model/Host.js";
import User from "../../model/User.js";
import { logAudit } from "../../services/auditLogger.js";
import { trackEvent } from "../../services/Analytics.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";
import { isUpcomingUTC, isExpiredUTC, nowUTC, toUTCDateTime } from "../../utils/dateTimeUtils.js";

// Helper: Enrich trip with host+user data
async function enrichTripWithHost(trip, isAuthenticated = false) {
  const t = { ...trip };
  if (t.host_id) {
    const host = await Host.get(t.host_id);
    if (host) {
      const user = await User.get(host.user_id);
      t.host = {
        id: host.id,
        full_name: host.full_name,
        country: host.country,
        city: host.city,
        user_id: host.user_id,
        User: user ? { profile_image: user.profile_image, verified: user.verified } : null
      };

      if (isAuthenticated) {
        t.host.whatsapp = host.whatsapp;
        t.host.phone = host.phone;
        t.host.facebook = host.facebook;
        t.host.instagram = host.instagram;
        if (t.host.User && user) {
          t.host.User.email = user.email;
        }
      }
    }
  }
  return t;
}

// Helper: Batch enrich trips with host+user data (solves N+1 query patterns)
async function batchEnrichTripsWithHosts(trips, isAuthenticated = false) {
  if (!trips || trips.length === 0) return [];
  
  const hostIds = [...new Set(trips.map(t => t.host_id).filter(Boolean))];
  if (hostIds.length === 0) return trips;

  let hostsList = [];
  try {
    hostsList = await Host.batchGet(hostIds);
  } catch (err) {
    console.error("Host batchGet failed, falling back to individual fetches", err);
    return Promise.all(trips.map(t => enrichTripWithHost(t, isAuthenticated)));
  }

  const hostsMap = {};
  for (const h of hostsList) {
    if (h && h.id) {
      hostsMap[h.id] = h;
    }
  }

  const userIds = [...new Set(hostsList.map(h => h.user_id).filter(Boolean))];
  const usersMap = {};
  if (userIds.length > 0) {
    try {
      const usersList = await User.batchGet(userIds);
      for (const u of usersList) {
        if (u && u.id) {
          usersMap[u.id] = u;
        }
      }
    } catch (err) {
      console.error("User batchGet failed", err);
    }
  }

  return trips.map(trip => {
    const t = { ...trip };
    const host = hostsMap[t.host_id];
    if (host) {
      const user = usersMap[host.user_id];
      t.host = {
        id: host.id,
        full_name: host.full_name,
        country: host.country,
        city: host.city,
        user_id: host.user_id,
        User: user ? { profile_image: user.profile_image, verified: user.verified } : null
      };

      if (isAuthenticated) {
        t.host.whatsapp = host.whatsapp;
        t.host.phone = host.phone;
        t.host.facebook = host.facebook;
        t.host.instagram = host.instagram;
        if (t.host.User && user) {
          t.host.User.email = user.email;
        }
      }
    }
    return t;
  });
}

export const createTrip = async (req, res) => {
  try {
    const userId = req.user.id;
    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts.find(h => h.status === "approved");
    if (!host) return res.status(403).json({ message: "Only approved hosts can create trips" });

    const { from_country, from_state, from_city, to_country, to_city, travel_date, departure_time, arrival_date, arrival_time, airline, flight_number, age, languages } = req.body;
    if (!from_country || !from_city || !to_country || !to_city || !travel_date || !departure_time) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (languages && !Array.isArray(languages)) return res.status(400).json({ message: "languages must be an array" });

    const trip = await TravelTrip.create({ host_id: host.id, from_country, from_state, from_city, to_country, to_city, travel_date, departure_time, arrival_date, arrival_time, airline, flight_number, age, languages });
    await deleteCacheByPrefix("travel:public:browse:");
    await deleteCacheByPrefix("travel:public:search:");

    trackEvent({ event_type: "TRAVEL_TRIP_CREATED", actor: { user_id: userId, host_id: host.id }, entity: { type: "travel_trip", id: trip.id }, location: { country: from_country, state: from_state, city: from_city }, metadata: { to_country, to_city, travel_date } }).catch(console.error);
    logAudit({ action: "TRAVEL_TRIP_CREATED", actor: { user_id: userId, host_id: host.id }, target: { type: "travel_trip", id: trip.id }, req }).catch(console.error);

    return res.json({ success: true, trip_id: trip.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const searchTrips = async (req, res) => {
  try {
    const { from_country, to_country, date, page = 1, limit = 20 } = req.query;
    if (!from_country || !to_country || !date) return res.status(400).json({ message: "from_country, to_country, date required" });
    const offset = (page - 1) * limit;

    // Query by to_country GSI then filter
    let trips = await TravelTrip.query("to_country").eq(to_country).exec();
    trips = trips.filter(t => t.from_country === from_country && t.travel_date === date && t.status === "approved");
    trips.sort((a, b) => toUTCDateTime(a.travel_date).getTime() - toUTCDateTime(b.travel_date).getTime());
    const paginated = trips.slice(offset, offset + Number(limit));

    const results = await batchEnrichTripsWithHosts(paginated, true);
    return res.json({ success: true, page: Number(page), results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const myTrips = async (req, res) => {
  try {
    const userId = req.user.id;
    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts[0];
    if (!host) return res.json({ success: true, trips: [] });

    let trips = await TravelTrip.query("host_id").eq(host.id).exec();
    trips.sort((a, b) => toUTCDateTime(b.travel_date).getTime() - toUTCDateTime(a.travel_date).getTime());

    const response = trips.map(trip => {
      let status = trip.status;
      if (trip.status === "approved" && isExpiredUTC(trip.travel_date, trip.departure_time)) {
        status = "expired";
      }
      return {
        ...trip,
        id: trip.id,
        from_city: trip.from_city,
        to_city: trip.to_city,
        travel_date: trip.travel_date,
        status
      };
    });

    return res.json({ success: true, trips: response });
  } catch (err) {
    console.error("myTrips error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminGetPendingTrips = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;

    let trips = await TravelTrip.query("status").eq("pending").exec();
    trips = trips.filter(t => isUpcomingUTC(t.travel_date, t.departure_time));
    trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const paginated = trips.slice(offset, offset + limit);

    const results = await batchEnrichTripsWithHosts(paginated, true);
    return res.json({ success: true, page, results });
  } catch (err) {
    console.error("ADMIN GET PENDING TRIPS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminApproveTrip = async (req, res) => {
  try {
    const tripId = req.params.trip_id;
    if (!tripId) return res.status(400).json({ message: "Invalid Trip ID" });

    const trip = await TravelTrip.get(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status === "approved") return res.status(400).json({ message: "Trip already approved" });

    await TravelTrip.update({ id: trip.id }, { status: "approved" });

    // Notify trip owner
    const ownerHost = await Host.get(trip.host_id);
    if (ownerHost) {
      const ownerUser = await User.get(ownerHost.user_id);
      if (ownerUser?.email) {
        notifyAndEmail({
          userId: ownerHost.user_id,
          email: ownerUser.email,
          type: "TRAVEL_TRIP_APPROVED",
          title: "Your trip was approved",
          message: "Your travel trip has been approved by an administrator and is now live.",
          metadata: { trip_id: trip.id }
        }).catch(console.error);
      }
    }

    logAudit({ action: "ADMIN_APPROVED_TRIP", actor: { id: req.admin.id, role: "admin" }, target: { type: "travel_trip", id: trip.id }, severity: "MEDIUM", req }).catch(console.error);
    await deleteCacheByPrefix("travel:");

    return res.json({ success: true, message: "Trip approved successfully" });
  } catch (err) {
    console.error("ADMIN APPROVE TRIP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminRejectTrip = async (req, res) => {
  try {
    const tripId = req.params.trip_id;
    if (!tripId) return res.status(400).json({ message: "Invalid Trip ID" });

    const trip = await TravelTrip.get(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status === "rejected") return res.status(400).json({ message: "Trip already rejected" });

    await TravelTrip.update({ id: trip.id }, { status: "rejected" });

    // Notify trip owner
    const ownerHost = await Host.get(trip.host_id);
    if (ownerHost) {
      const ownerUser = await User.get(ownerHost.user_id);
      if (ownerUser?.email) {
        notifyAndEmail({
          userId: ownerHost.user_id,
          email: ownerUser.email,
          type: "TRAVEL_TRIP_REJECTED",
          title: "Your trip was rejected",
          message: "Your travel trip has been rejected by an administrator.",
          metadata: { trip_id: trip.id }
        }).catch(console.error);
      }
    }

    logAudit({ action: "ADMIN_REJECTED_TRIP", actor: { id: req.admin.id, role: "admin" }, target: { type: "travel_trip", id: trip.id }, severity: "MEDIUM", req }).catch(console.error);
    await deleteCacheByPrefix("travel:");

    return res.json({ success: true, message: "Trip rejected successfully" });
  } catch (err) {
    console.error("ADMIN REJECT TRIP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const publicBrowseTrips = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
    const offset = (page - 1) * limit;
    const from_country = req.query.from_country?.trim() || null;
    const to_country = req.query.to_country?.trim() || null;
    const country = req.query.country?.trim() || null;

    const cacheKey = `travel:public:browse:${from_country || "all"}:${to_country || "all"}:${country || "all"}:${page}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, source: "cache", page, results: cached });

    // Query by status GSI (only approved trips are public)
    let trips = await TravelTrip.query("status").eq("approved").exec();
    trips = trips.filter(t => isUpcomingUTC(t.travel_date, t.departure_time));
    if (from_country) trips = trips.filter(t => t.from_country === from_country);
    if (to_country) trips = trips.filter(t => t.to_country === to_country);
    if (country) trips = trips.filter(t => t.from_country === country || t.to_country === country);
    trips.sort((a, b) => toUTCDateTime(a.travel_date).getTime() - toUTCDateTime(b.travel_date).getTime());
    const paginated = trips.slice(offset, offset + limit);

    const isAuthenticated = !!req.user;
    const enrichedTrips = await batchEnrichTripsWithHosts(paginated, isAuthenticated);
    const results = enrichedTrips.map(enriched => {
      return {
        id: enriched.id, host_id: enriched.host_id,
        host: enriched.host ? {
          id: enriched.host.id,
          full_name: enriched.host.full_name,
          country: enriched.host.country,
          city: enriched.host.city,
          whatsapp: enriched.host.whatsapp || null,
          phone: enriched.host.phone || null,
          facebook: enriched.host.facebook || null,
          instagram: enriched.host.instagram || null,
          profile_image: enriched.host.User?.profile_image || null,
          verified: enriched.host.User?.verified || false
        } : null,
        trip_meta: { age: enriched.age ?? null, languages: Array.isArray(enriched.languages) ? enriched.languages : [] },
        origin: `${enriched.from_city}, ${enriched.from_country}`, from_country: enriched.from_country, from_city: enriched.from_city,
        destination: `${enriched.to_city}, ${enriched.to_country}`, to_country: enriched.to_country, to_city: enriched.to_city,
        date: enriched.travel_date, time: enriched.departure_time,
        flight: { airline: enriched.airline || null, flightNumber: enriched.flight_number || null, from: enriched.from_city, to: enriched.to_city, departureDate: enriched.travel_date, departureTime: enriched.departure_time, arrivalDate: enriched.arrival_date || null, arrivalTime: enriched.arrival_time || null }
      };
    });

    await setCache(cacheKey, results, 60);
    return res.json({ success: true, source: "db", page, results });
  } catch (err) {
    console.error("publicBrowseTrips error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const publicSearchTrips = async (req, res) => {
  try {
    const { from_country, to_country, date, page = 1, limit = 10 } = req.query;
    if (!from_country || !to_country || !date) return res.status(400).json({ message: "from_country, to_country, date required" });
    const offset = (page - 1) * limit;

    const cacheKey = `travel:public:search:${from_country}:${to_country}:${date}:${page}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, source: "cache", page: Number(page), results: cached });

    let trips = await TravelTrip.query("to_country").eq(to_country).exec();
    trips = trips.filter(t => t.from_country === from_country && t.travel_date === date && t.status === "approved" && isUpcomingUTC(t.travel_date, t.departure_time));
    trips.sort((a, b) => toUTCDateTime(a.travel_date).getTime() - toUTCDateTime(b.travel_date).getTime());
    const paginated = trips.slice(offset, offset + Number(limit));

    const isAuthenticated = !!req.user;
    const enrichedTrips = await batchEnrichTripsWithHosts(paginated, isAuthenticated);
    const results = enrichedTrips.map(enriched => {
      return {
        id: enriched.id,
        host: enriched.host ? {
          id: enriched.host.id,
          full_name: enriched.host.full_name,
          country: enriched.host.country,
          city: enriched.host.city,
          whatsapp: enriched.host.whatsapp || null,
          phone: enriched.host.phone || null,
          facebook: enriched.host.facebook || null,
          instagram: enriched.host.instagram || null,
          profile_image: enriched.host.User?.profile_image || null,
          verified: enriched.host.User?.verified || false
        } : null,
        trip_meta: { age: enriched.age || null, languages: Array.isArray(enriched.languages) ? enriched.languages : [] },
        destination: `${enriched.to_city}, ${enriched.to_country}`, date: enriched.travel_date, time: enriched.departure_time
      };
    });

    trackEvent({ event_type: "TRAVEL_TRIP_SEARCHED", actor: req.user ? { user_id: req.user.id } : {}, metadata: { from_country, to_country, date, results_count: results.length } });
    await setCache(cacheKey, results, 60);
    return res.json({ success: true, page: Number(page), results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const publicTripPreview = async (req, res) => {
  try {
    const trip = await TravelTrip.get(req.params.trip_id);
    if (!trip || (trip.status !== "approved" && !req.admin)) return res.status(404).json({ message: "Trip not found" });
    if (isExpiredUTC(trip.travel_date, trip.departure_time) && !req.admin) {
      return res.status(404).json({ message: "Trip not found or expired" });
    }

    const isAuthenticated = !!req.user;
    const enriched = await enrichTripWithHost(trip, isAuthenticated || !!req.admin);
    trackEvent({ event_type: "TRAVEL_TRIP_VIEWED", actor: req.user ? { user_id: req.user.id } : {}, entity: { type: "travel_trip", id: trip.id }, location: { country: trip.from_country, state: null } });
    return res.json({ success: true, trip: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ADMIN CONTROLLERS
export const adminGetAllTrips = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let trips;
    if (status) {
      trips = await TravelTrip.query("status").eq(status).exec();
    } else {
      // Paginated scan to avoid loading the entire table into memory
      const SCAN_BATCH = Math.max(limit, 50);
      let cursor = null;
      const collected = [];
      const MAX_SCAN_ITERATIONS = 20;
      let iterations = 0;

      do {
        iterations++;
        let scanQuery = TravelTrip.scan().limit(SCAN_BATCH);
        if (cursor) scanQuery = scanQuery.startAt(cursor);
        const batch = await scanQuery.exec();
        collected.push(...batch);
        cursor = batch.lastKey || null;
      } while (cursor && iterations < MAX_SCAN_ITERATIONS);

      trips = collected;
    }

    trips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const paginated = trips.slice(offset, offset + limit);

    const enrichedTrips = await batchEnrichTripsWithHosts(paginated, true);
    const results = enrichedTrips.map(enriched => {
      if (enriched.status === "approved" && isExpiredUTC(enriched.travel_date, enriched.departure_time)) {
        enriched.status = "expired";
      }
      return enriched;
    });
    return res.json({ success: true, page, results });
  } catch (err) {
    console.error("ADMIN GET TRIPS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminCancelTrip = async (req, res) => {
  try {
    const tripId = req.params.trip_id;
    if (!tripId) return res.status(400).json({ message: "Invalid Trip ID" });

    const trip = await TravelTrip.get(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.status === "cancelled") return res.status(400).json({ message: "Trip already cancelled" });

    await TravelTrip.update({ id: trip.id }, { status: "cancelled" });

    // Notify trip owner
    const ownerHost = await Host.get(trip.host_id);
    if (ownerHost) {
      const ownerUser = await User.get(ownerHost.user_id);
      if (ownerUser?.email) {
        notifyAndEmail({ userId: ownerHost.user_id, email: ownerUser.email, type: "TRAVEL_TRIP_CANCELLED", title: "Your trip was cancelled", message: "Your travel trip was cancelled by an administrator.", metadata: { trip_id: trip.id } }).catch(console.error);
      }
    }

    logAudit({ action: "ADMIN_CANCELLED_TRIP", actor: { id: req.admin.id, role: "admin" }, target: { type: "travel_trip", id: trip.id }, severity: "HIGH", req }).catch(console.error);
    trackEvent({ event_type: "ADMIN_CANCELLED_TRIP", actor: { admin_id: req.admin.id }, entity: { type: "travel_trip", id: trip.id } }).catch(console.error);
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");

    return res.json({ success: true, message: "Trip cancelled successfully" });
  } catch (err) {
    console.error("ADMIN CANCEL TRIP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminBlockHost = async (req, res) => {
  try {
    const hostId = req.params.host_id;
    if (!hostId) return res.status(400).json({ message: "Invalid host id" });
    const host = await Host.get(hostId);
    if (!host) return res.status(404).json({ message: "Host not found" });

    await Host.update({ id: host.id }, { status: "rejected", rejection_reason: "Blocked by admin" });

    // Cancel all host trips
    const trips = await TravelTrip.query("host_id").eq(host.id).exec();
    await Promise.all(trips.map(t => TravelTrip.update({ id: t.id }, { status: "cancelled" })));

    logAudit({ action: "ADMIN_BLOCKED_HOST", actor: { id: req.admin.id, role: "admin" }, target: { type: "host", id: host.id }, severity: "CRITICAL", req }).catch(console.error);
    AnalyticsEvent.create({ event_type: "HOST_BLOCKED", user_id: req.admin.id, country: host.country || undefined }).catch(console.error);
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");
    return res.json({ success: true, message: "Host and trips blocked successfully" });
  } catch (err) {
    console.error("ADMIN BLOCK HOST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
