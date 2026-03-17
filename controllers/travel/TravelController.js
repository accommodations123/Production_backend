import TravelTrip from "../../model/travel/TravelTrip.js";
import TravelMatch from "../../model/travel/TravelMatch.js";
import Host from "../../model/Host.js";
import User from "../../model/User.js";
import { logAudit } from "../../services/auditLogger.js";
import { trackEvent } from "../../services/Analytics.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
import AnalyticsEvent from "../../model/DashboardAnalytics/AnalyticsEvent.js";

// Helper: Enrich trip with host+user data
async function enrichTripWithHost(trip) {
  const t = { ...trip };
  if (t.host_id) {
    const host = await Host.get(t.host_id);
    if (host) {
      const user = await User.get(host.user_id);
      t.host = {
        id: host.id, full_name: host.full_name, country: host.country, city: host.city,
        whatsapp: host.whatsapp, phone: host.phone, user_id: host.user_id,
        User: user ? { profile_image: user.profile_image, email: user.email, verified: user.verified } : null
      };
    }
  }
  return t;
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
    trips = trips.filter(t => t.from_country === from_country && t.travel_date === date && t.status === "active");
    trips.sort((a, b) => new Date(a.travel_date) - new Date(b.travel_date));
    const paginated = trips.slice(offset, offset + Number(limit));

    const results = await Promise.all(paginated.map(t => enrichTripWithHost(t)));
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
    trips.sort((a, b) => new Date(b.travel_date) - new Date(a.travel_date));

    // For each trip, fetch matches
    const response = await Promise.all(trips.map(async trip => {
      const sentMatches = await TravelMatch.query("trip_id").eq(trip.id).exec();
      const receivedMatches = await TravelMatch.query("matched_trip_id").eq(trip.id).exec();
      const hasPending = sentMatches.some(m => m.status === "pending") || receivedMatches.some(m => m.status === "pending");
      const hasAccepted = sentMatches.some(m => m.status === "accepted") || receivedMatches.some(m => m.status === "accepted");

      return {
        id: trip.id, from_city: trip.from_city, to_city: trip.to_city,
        travel_date: trip.travel_date, status: trip.status,
        match_state: hasAccepted ? "connected" : hasPending ? "pending" : "none",
        sent_matches: sentMatches, received_matches: receivedMatches
      };
    }));

    return res.json({ success: true, trips: response });
  } catch (err) {
    console.error("myTrips error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const travelMatchAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trip_id, matched_trip_id, action } = req.body;
    if (!trip_id || !matched_trip_id || !action) return res.status(400).json({ message: "Missing required fields" });
    if (trip_id === matched_trip_id) return res.status(400).json({ message: "Cannot match the same trip" });

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts[0];
    if (!host) return res.status(403).json({ message: "Host not found" });

    const [tripA, tripB] = await Promise.all([TravelTrip.get(trip_id), TravelTrip.get(matched_trip_id)]);
    if (!tripA || !tripB) return res.status(404).json({ message: "Trip not found" });

    if (action === "request") {
      if (tripA.host_id !== host.id) return res.status(403).json({ message: "You can only send a request from your own trip" });
      if (tripB.host_id === host.id) return res.status(400).json({ message: "You cannot request a match with your own trip" });
    }
    if ((action === "accept" || action === "reject") && tripB.host_id !== host.id) return res.status(403).json({ message: "You are not authorized to respond to this request" });
    if (action === "cancel" && tripA.host_id !== host.id && tripB.host_id !== host.id) return res.status(403).json({ message: "You are not authorized to cancel this match" });

    // Find existing match
    const existingMatches = await TravelMatch.query("trip_id").eq(trip_id).exec();
    let match = existingMatches.find(m => m.matched_trip_id === matched_trip_id);

    if (action === "request") {
      if (match) return res.status(409).json({ message: "Match already exists" });
      match = await TravelMatch.create({ trip_id, matched_trip_id, status: "pending" });

      // Notify receiver
      const receiverHost = await Host.get(tripB.host_id);
      if (receiverHost) {
        const receiverUser = await User.get(receiverHost.user_id);
        if (receiverUser?.email) {
          notifyAndEmail({ userId: receiverHost.user_id, email: receiverUser.email, type: "TRAVEL_MATCH_REQUESTED", title: "New travel match request", message: "You have received a new travel match request.", metadata: { trip_id, matched_trip_id } }).catch(console.error);
        }
      }
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      trackEvent({ event_type: "TRAVEL_MATCH_REQUESTED", actor: { user_id: userId, host_id: host.id }, entity: { type: "travel_match", id: match.id }, metadata: { trip_id, matched_trip_id } }).catch(console.error);
      return res.json({ success: true, status: "pending" });
    }

    if (!match) return res.status(404).json({ message: "Match not found" });

    if (action === "accept") {
      if (match.status !== "pending") return res.status(400).json({ message: "Only pending matches can be accepted" });
      await TravelMatch.update({ id: match.id }, { status: "accepted", consent_given: true });
      const requesterHost = await Host.get(tripA.host_id);
      if (requesterHost) { const u = await User.get(requesterHost.user_id); if (u?.email) notifyAndEmail({ userId: requesterHost.user_id, email: u.email, type: "TRAVEL_MATCH_ACCEPTED", title: "Travel match accepted", message: "Your travel match request has been accepted.", metadata: { trip_id, matched_trip_id } }).catch(console.error); }
      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      return res.json({ success: true, status: "accepted", whatsapp_unlocked: true });
    }

    if (action === "reject") {
      if (match.status !== "pending") return res.status(400).json({ message: "Only pending matches can be rejected" });
      await TravelMatch.update({ id: match.id }, { status: "rejected" });
      const requesterHost = await Host.get(tripA.host_id);
      if (requesterHost) { const u = await User.get(requesterHost.user_id); if (u?.email) notifyAndEmail({ userId: requesterHost.user_id, email: u.email, type: "TRAVEL_MATCH_REJECTED", title: "Travel match rejected", message: "Your travel match request was rejected.", metadata: { trip_id, matched_trip_id } }).catch(console.error); }
      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      return res.json({ success: true, status: "rejected" });
    }

    if (action === "cancel") {
      if (match.status !== "accepted") return res.status(400).json({ message: "Only accepted matches can be cancelled" });
      await TravelMatch.update({ id: match.id }, { status: "cancelled" });
      const otherHostId = host.id === tripA.host_id ? tripB.host_id : tripA.host_id;
      const otherHost = await Host.get(otherHostId);
      if (otherHost) { const u = await User.get(otherHost.user_id); if (u?.email) notifyAndEmail({ userId: otherHost.user_id, email: u.email, type: "TRAVEL_MATCH_CANCELLED", title: "Travel match cancelled", message: "A travel match you were connected to has been cancelled.", metadata: { trip_id, matched_trip_id } }).catch(console.error); }
      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      return res.json({ success: true, status: "cancelled" });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getReceivedMatchRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts[0];
    if (!host) return res.json({ success: true, requests: [] });

    const cacheKey = `travel:matches:received:v3:${host.id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, source: "cache", requests: cached });

    // Get all trips for this host
    const myTrips = await TravelTrip.query("host_id").eq(host.id).exec();
    const myTripIds = new Set(myTrips.map(t => t.id));

    // Scan matches (no complex join available in DynamoDB)
    const allMatches = await TravelMatch.scan().exec();
    const receivedMatches = allMatches.filter(m =>
      myTripIds.has(m.matched_trip_id) && (m.status === "pending" || m.status === "accepted")
    );
    receivedMatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const requests = await Promise.all(receivedMatches.map(async m => {
      const isAccepted = m.status === "accepted" && m.consent_given === true;
      const requesterTrip = await TravelTrip.get(m.trip_id);
      if (!requesterTrip) return null;
      const requesterHost = await Host.get(requesterTrip.host_id);
      if (!requesterHost) return null;
      const requesterUser = await User.get(requesterHost.user_id);

      return {
        match_id: m.id, trip_id: m.trip_id, matched_trip_id: m.matched_trip_id,
        status: m.status, requested_at: m.created_at,
        requester: {
          full_name: requesterHost.full_name, country: requesterHost.country, city: requesterHost.city,
          profile_image: requesterUser?.profile_image || null,
          whatsapp: isAccepted ? requesterHost.whatsapp : null,
          phone: isAccepted ? requesterHost.phone : null,
          email: isAccepted ? requesterUser?.email : null
        }
      };
    }));

    const filteredRequests = requests.filter(Boolean);
    await setCache(cacheKey, filteredRequests, 60);
    return res.json({ success: true, source: "db", requests: filteredRequests });
  } catch (err) {
    console.error("getReceivedMatchRequests error:", err);
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

    const today = new Date().toISOString().slice(0, 10);
    const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const cacheKey = `travel:public:browse:${from_country || "all"}:${to_country || "all"}:${page}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, source: "cache", page, results: cached });

    // Query by status GSI
    let trips = await TravelTrip.query("status").eq("active").exec();
    trips = trips.filter(t => t.travel_date >= today && t.travel_date <= maxDate);
    if (from_country) trips = trips.filter(t => t.from_country === from_country);
    if (to_country) trips = trips.filter(t => t.to_country === to_country);
    trips.sort((a, b) => new Date(a.travel_date) - new Date(b.travel_date));
    const paginated = trips.slice(offset, offset + limit);

    const results = await Promise.all(paginated.map(async trip => {
      const enriched = await enrichTripWithHost(trip);
      return {
        id: enriched.id, host_id: enriched.host_id,
        host: enriched.host ? { id: enriched.host.id, full_name: enriched.host.full_name, country: enriched.host.country, city: enriched.host.city, profile_image: enriched.host.User?.profile_image || null, verified: enriched.host.User?.verified || false } : null,
        trip_meta: { age: enriched.age ?? null, languages: Array.isArray(enriched.languages) ? enriched.languages : [] },
        origin: `${enriched.from_city}, ${enriched.from_country}`, from_country: enriched.from_country, from_city: enriched.from_city,
        destination: `${enriched.to_city}, ${enriched.to_country}`, to_country: enriched.to_country, to_city: enriched.to_city,
        date: enriched.travel_date, time: enriched.departure_time,
        flight: { airline: enriched.airline || null, flightNumber: enriched.flight_number || null, from: enriched.from_city, to: enriched.to_city, departureDate: enriched.travel_date, departureTime: enriched.departure_time, arrivalDate: enriched.arrival_date || null, arrivalTime: enriched.arrival_time || null }
      };
    }));

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
    trips = trips.filter(t => t.from_country === from_country && t.travel_date === date && t.status === "active");
    trips.sort((a, b) => new Date(a.travel_date) - new Date(b.travel_date));
    const paginated = trips.slice(offset, offset + Number(limit));

    const results = await Promise.all(paginated.map(async trip => {
      const enriched = await enrichTripWithHost(trip);
      return {
        id: enriched.id,
        host: enriched.host ? { id: enriched.host.id, full_name: enriched.host.full_name, country: enriched.host.country, city: enriched.host.city, profile_image: enriched.host.User?.profile_image || null, verified: enriched.host.User?.verified || false } : null,
        trip_meta: { age: enriched.age || null, languages: Array.isArray(enriched.languages) ? enriched.languages : [] },
        destination: `${enriched.to_city}, ${enriched.to_country}`, date: enriched.travel_date, time: enriched.departure_time
      };
    }));

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
    if (!trip || trip.status !== "active") return res.status(404).json({ message: "Trip not found" });

    const enriched = await enrichTripWithHost(trip);
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

    let trips = status ? await TravelTrip.query("status").eq(status).exec() : await TravelTrip.scan().exec();
    trips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginated = trips.slice(offset, offset + limit);

    const results = await Promise.all(paginated.map(t => enrichTripWithHost(t)));
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

    // Cancel all related matches
    const [sentMatches, receivedMatches] = await Promise.all([
      TravelMatch.query("trip_id").eq(trip.id).exec(),
      TravelMatch.query("matched_trip_id").eq(trip.id).exec()
    ]);
    const allRelatedMatches = [...sentMatches, ...receivedMatches];

    await Promise.all(allRelatedMatches.map(m => TravelMatch.update({ id: m.id }, { status: "cancelled" })));

    // Notify trip owner
    const ownerHost = await Host.get(trip.host_id);
    if (ownerHost) {
      const ownerUser = await User.get(ownerHost.user_id);
      if (ownerUser?.email) {
        notifyAndEmail({ userId: ownerHost.user_id, email: ownerUser.email, type: "TRAVEL_TRIP_CANCELLED", title: "Your trip was cancelled", message: "Your travel trip was cancelled by an administrator.", metadata: { trip_id: trip.id } }).catch(console.error);
      }
    }

    // Notify other affected hosts (deduplicated)
    const notifiedHosts = new Set();
    for (const match of allRelatedMatches) {
      const otherTripId = match.trip_id === trip.id ? match.matched_trip_id : match.trip_id;
      const otherTrip = await TravelTrip.get(otherTripId);
      if (!otherTrip || notifiedHosts.has(otherTrip.host_id)) continue;
      notifiedHosts.add(otherTrip.host_id);
      const otherHost = await Host.get(otherTrip.host_id);
      if (!otherHost) continue;
      const otherUser = await User.get(otherHost.user_id);
      if (!otherUser?.email) continue;
      notifyAndEmail({ userId: otherHost.user_id, email: otherUser.email, type: "TRAVEL_MATCH_CANCELLED", title: "Travel match cancelled", message: "A travel match was cancelled because a related trip was removed by an administrator.", metadata: { trip_id: trip.id } }).catch(console.error);
    }

    logAudit({ action: "ADMIN_CANCELLED_TRIP", actor: { id: req.admin.id, role: "admin" }, target: { type: "travel_trip", id: trip.id }, severity: "HIGH", req }).catch(console.error);
    trackEvent({ event_type: "ADMIN_CANCELLED_TRIP", actor: { admin_id: req.admin.id }, entity: { type: "travel_trip", id: trip.id } }).catch(console.error);
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");

    return res.json({ success: true, message: "Trip and related matches cancelled" });
  } catch (err) {
    console.error("ADMIN CANCEL TRIP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminGetAllMatches = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let matches = await TravelMatch.scan().exec();
    if (status) matches = matches.filter(m => m.status === status);
    matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginated = matches.slice(offset, offset + limit);

    const results = await Promise.all(paginated.map(async m => {
      const [requesterTrip, receiverTrip] = await Promise.all([TravelTrip.get(m.trip_id), TravelTrip.get(m.matched_trip_id)]);
      return {
        ...m,
        requesterTrip: requesterTrip ? { id: requesterTrip.id, from_city: requesterTrip.from_city, to_city: requesterTrip.to_city } : null,
        receiverTrip: receiverTrip ? { id: receiverTrip.id, from_city: receiverTrip.from_city, to_city: receiverTrip.to_city } : null
      };
    }));

    return res.json({ success: true, page, results });
  } catch (err) {
    console.error("ADMIN GET MATCHES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const adminCancelMatch = async (req, res) => {
  try {
    const matchId = req.params.match_id;
    if (!matchId) return res.status(400).json({ message: "Invalid match id" });
    const match = await TravelMatch.get(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status === "cancelled") return res.status(400).json({ message: "Match already cancelled" });

    await TravelMatch.update({ id: match.id }, { status: "cancelled" });
    logAudit({ action: "ADMIN_CANCELLED_MATCH", actor: { id: req.admin.id, role: "admin" }, target: { type: "travel_match", id: match.id }, severity: "MEDIUM", req }).catch(console.error);
    AnalyticsEvent.create({ event_type: "ADMIN_CANCELLED_MATCH", user_id: req.admin.id }).catch(console.error);
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    return res.json({ success: true, message: "Match cancelled" });
  } catch (err) {
    console.error("ADMIN CANCEL MATCH ERROR:", err);
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

    // Cancel all related matches
    const tripIds = new Set(trips.map(t => t.id));
    const allMatches = await TravelMatch.scan().exec();
    const relatedMatches = allMatches.filter(m => tripIds.has(m.trip_id) || tripIds.has(m.matched_trip_id));
    await Promise.all(relatedMatches.map(m => TravelMatch.update({ id: m.id }, { status: "cancelled" })));

    logAudit({ action: "ADMIN_BLOCKED_HOST", actor: { id: req.admin.id, role: "admin" }, target: { type: "host", id: host.id }, severity: "CRITICAL", req }).catch(console.error);
    AnalyticsEvent.create({ event_type: "HOST_BLOCKED", user_id: req.admin.id, country: host.country || null }).catch(console.error);
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");
    return res.json({ success: true, message: "Host, trips, and matches blocked" });
  } catch (err) {
    console.error("ADMIN BLOCK HOST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
