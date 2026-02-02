import TravelTrip from "../../model/travel/TravelTrip.js";
import TravelMatch from "../../model/travel/TravelMatch.js";
import Host from "../../model/Host.js";
import User from "../../model/User.js";
import { Op } from "sequelize";
import { logAudit } from "../../services/auditLogger.js";
import { trackEvent } from "../../services/Analytics.js";
import {getCache,setCache,deleteCache,deleteCacheByPrefix} from "../../services/cacheService.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
import "../../model/associations.js"
export const createTrip = async (req, res) => {
  try {
    const userId = req.user.id;

    // Host must exist & be approved
    const host = await Host.findOne({
      where: {
        user_id: userId,
        status: "approved"
      }
    });

    if (!host) {
      return res.status(403).json({
        message: "Only approved hosts can create trips"
      });
    }

    const {
      from_country,
      from_state,
      from_city,
      to_country,
      to_city,
      travel_date,
      departure_time,
      arrival_date,
      arrival_time,
      airline,
      flight_number,
      age,
      languages
    } = req.body;

    // Hard validation
    if (
      !from_country ||
      !from_city ||
      !to_country ||
      !to_city ||
      !travel_date ||
      !departure_time
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (languages && !Array.isArray(languages)) {
      return res.status(400).json({ message: "languages must be an array" });
    }

    const trip = await TravelTrip.create({
      host_id: host.id,
      from_country,
      from_state,
      from_city,
      to_country,
      to_city,
      travel_date,
      departure_time,
      arrival_date,
      arrival_time,
      airline,
      flight_number,
      age,
      languages
    });
    await deleteCacheByPrefix("travel:public:browse:");
    await deleteCacheByPrefix("travel:public:search:");

    trackEvent({
      event_type: "TRAVEL_TRIP_CREATED",
      actor: { user_id: userId, host_id:host.id },
      entity: { type: "travel_trip", id: trip.id },
      location: {
        country: from_country,
        state: from_state,
        city: from_city
      },
      metadata: {
        to_country,
        to_city,
        travel_date
      }
    }).catch(console.error);


    logAudit({
  action: "TRAVEL_TRIP_CREATED",
  actor: { user_id: userId, host_id: host.id },
  target: { type: "travel_trip", id: trip.id },
  req
}).catch(console.error);



    return res.json({
      success: true,
      trip_id: trip.id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const searchTrips = async (req, res) => {
  try {
    const {
      from_country,
      to_country,
      date,
      page = 1,
      limit = 20
    } = req.query;

    if (!from_country || !to_country || !date) {
      return res.status(400).json({
        message: "from_country, to_country, date required"
      });
    }

    const offset = (page - 1) * limit;

    const trips = await TravelTrip.findAll({
      where: {
        from_country,
        to_country,
        travel_date: date,
        status: "active"
      },
      limit: Number(limit),
      offset,
      order: [["travel_date", "ASC"]],
      include: [
        {
          model: Host,
          as: "host",
          attributes: ["full_name", "city", "country"],
          include: [
            {
              model: User,
              attributes: ["verified"]
            }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      page: Number(page),
      results: trips
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const myTrips = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔒 Resolve host (auth boundary)
    const host = await Host.findOne({
      where: { user_id: userId },
      attributes: ["id"]
    });

    if (!host) {
      return res.json({ success: true, trips: [] });
    }

    const trips = await TravelTrip.findAll({
      where: { host_id: host.id },
      order: [["travel_date", "DESC"]],
      attributes: [
        "id",
        "from_city",
        "to_city",
        "travel_date",
        "status"
      ],
      include: [
        {
          model: TravelMatch,
          as: "sentMatches",
          required: false,
          attributes: ["id", "status", "matched_trip_id"]
        },
        {
          model: TravelMatch,
          as: "receivedMatches",
          required: false,
          attributes: ["id", "status", "trip_id"]
        }
      ]
    });

    // 🧠 Normalize for frontend (NO GUESSING)
    const response = trips.map(trip => {
      const t = trip.toJSON();

      const hasPending =
        t.sentMatches.some(m => m.status === "pending") ||
        t.receivedMatches.some(m => m.status === "pending");

      const hasAccepted =
        t.sentMatches.some(m => m.status === "accepted") ||
        t.receivedMatches.some(m => m.status === "accepted");

      return {
        id: t.id,
        from_city: t.from_city,
        to_city: t.to_city,
        travel_date: t.travel_date,
        status: t.status,

        // 🔥 FRONTEND FLAGS (THIS FIXES CONNECT BUTTON)
        match_state: hasAccepted
          ? "connected"
          : hasPending
            ? "pending"
            : "none",

        // Optional but useful
        sent_matches: t.sentMatches,
        received_matches: t.receivedMatches
      };
    });

    return res.json({
      success: true,
      trips: response
    });

  } catch (err) {
    console.error("myTrips error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const travelMatchAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trip_id, matched_trip_id, action } = req.body;

    if (!trip_id || !matched_trip_id || !action) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (trip_id === matched_trip_id) {
      return res.status(400).json({ message: "Cannot match the same trip" });
    }

    // 🔒 Resolve host
    const host = await Host.findOne({ where: { user_id: userId } });
    if (!host) {
      return res.status(403).json({ message: "Host not found" });
    }

    // 🔒 Load both trips
    const [tripA, tripB] = await Promise.all([
      TravelTrip.findByPk(trip_id),
      TravelTrip.findByPk(matched_trip_id)
    ]);

    if (!tripA || !tripB) {
      return res.status(404).json({ message: "Trip not found" });
    }

    /* ============================
       🔐 AUTHORIZATION RULES
       ============================ */

    if (action === "request") {
      // You must own the SOURCE trip
      if (tripA.host_id !== host.id) {
        return res.status(403).json({
          message: "You can only send a request from your own trip"
        });
      }

      // You CANNOT request your own target trip
      if (tripB.host_id === host.id) {
        return res.status(400).json({
          message: "You cannot request a match with your own trip"
        });
      }
    }

    if (action === "accept" || action === "reject") {
      // Only the receiver can respond
      if (tripB.host_id !== host.id) {
        return res.status(403).json({
          message: "You are not authorized to respond to this request"
        });
      }
    }

    if (action === "cancel") {
      // Either party can cancel an accepted match
      if (tripA.host_id !== host.id && tripB.host_id !== host.id) {
        return res.status(403).json({
          message: "You are not authorized to cancel this match"
        });
      }
    }

    /* ============================
       🔎 FIND MATCH
       ============================ */
    let match = await TravelMatch.findOne({
      where: { trip_id, matched_trip_id }
    });

    /* ============================
       REQUEST
       ============================ */
    if (action === "request") {
      if (match) {
        return res.status(409).json({ message: "Match already exists" });
      }

      match = await TravelMatch.create({
        trip_id,
        matched_trip_id,
        status: "pending"
      });
      // 🔔 Notify receiver host
const receiverHost = await Host.findByPk(tripB.host_id, {
  include: [{ model: User, attributes: ["email"] }]
});

notifyAndEmail({
  userId: receiverHost.user_id,
  email: receiverHost.User.email,
  type: "TRAVEL_MATCH_REQUESTED",
  title: "New travel match request",
  message: "You have received a new travel match request.",
  metadata: { trip_id, matched_trip_id }
}).catch(console.error);


      await deleteCache(`travel:matches:received:${tripB.host_id}`);

     trackEvent({
  event_type: "TRAVEL_MATCH_REQUESTED",
  actor: { user_id: userId,host_id:host.id },
  entity: { type: "travel_match", id: match.id },
  metadata: {
    trip_id,
    matched_trip_id
  }
}).catch(console.error);


      logAudit({
        action: "TRAVEL_MATCH_REQUESTED",
        actor: { user_id: userId, host_id:host.id },
        target: { type: "travel_match", id: match.id },
        severity: "LOW",
        req
      }).catch(console.error);

      return res.json({ success: true, status: "pending" });
    }

    /* ============================
       BELOW REQUIRES EXISTING MATCH
       ============================ */
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    /* ============================
       ACCEPT
       ============================ */
    if (action === "accept") {
      if (match.status !== "pending") {
        return res.status(400).json({
          message: "Only pending matches can be accepted"
        });
      }

      match.status = "accepted";
      match.consent_given = true;
      await match.save();
      // 🔔 Notify requester host
const requesterHost = await Host.findByPk(tripA.host_id, {
  include: [{ model: User, attributes: ["email"] }]
});

notifyAndEmail({
  userId: requesterHost.user_id,
  email: requesterHost.User.email,
  type: "TRAVEL_MATCH_ACCEPTED",
  title: "Travel match accepted",
  message: "Your travel match request has been accepted.",
  metadata: { trip_id, matched_trip_id }
}).catch(console.error);


      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      trackEvent({
  event_type: "TRAVEL_MATCH_ACCEPTED",
  actor: { user_id: userId,host_id:host.id },
  entity: { type: "travel_match", id: match.id }
}).catch(console.error);


      return res.json({
        success: true,
        status: "accepted",
        whatsapp_unlocked: true
      });
    }

    /* ============================
       REJECT
       ============================ */
    if (action === "reject") {
      if (match.status !== "pending") {
        return res.status(400).json({
          message: "Only pending matches can be rejected"
        });
      }

      match.status = "rejected";
      await match.save();
      // 🔔 Notify requester host
const requesterHost = await Host.findByPk(tripA.host_id, {
  include: [{ model: User, attributes: ["email"] }]
});

notifyAndEmail({
  userId: requesterHost.user_id,
  email: requesterHost.User.email,
  type: "TRAVEL_MATCH_REJECTED",
  title: "Travel match rejected",
  message: "Your travel match request was rejected.",
  metadata: { trip_id, matched_trip_id }
}).catch(console.error);


      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      trackEvent({
  event_type: "TRAVEL_MATCH_REJECTED",
  actor: { user_id: userId, host_id:host.id },
  entity: { type: "travel_match", id: match.id }
}).catch(console.error);


      return res.json({ success: true, status: "rejected" });
    }

    /* ============================
       CANCEL
       ============================ */
    if (action === "cancel") {
      if (match.status !== "accepted") {
        return res.status(400).json({
          message: "Only accepted matches can be cancelled"
        });
      }

      match.status = "cancelled";
      await match.save();
      // 🔔 Notify the OTHER host
const otherHostId =
  host.id === tripA.host_id ? tripB.host_id : tripA.host_id;

const otherHost = await Host.findByPk(otherHostId, {
  include: [{ model: User, attributes: ["email"] }]
});

notifyAndEmail({
  userId: otherHost.user_id,
  email: otherHost.User.email,
  type: "TRAVEL_MATCH_CANCELLED",
  title: "Travel match cancelled",
  message: "A travel match you were connected to has been cancelled.",
  metadata: { trip_id, matched_trip_id }
}).catch(console.error);


      await deleteCache(`travel:matches:received:${tripA.host_id}`);
      await deleteCache(`travel:matches:received:${tripB.host_id}`);
      trackEvent({
  event_type: "TRAVEL_MATCH_CANCELLED",
  actor: { user_id: userId, host_id:host.id },
  entity: { type: "travel_match", id: match.id }
}).catch(console.error);


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

    // 1️⃣ Resolve host
    const host = await Host.findOne({
      where: { user_id: userId }
    });

    if (!host) {
      return res.json({ success: true, requests: [] });
    }

    const cacheKey = `travel:matches:received:${host.id}`;

    // 2️⃣ Cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        requests: cached
      });
    }

    // 3️⃣ DB query
    let matches = await TravelMatch.findAll({
      where: { status: "pending" },
      include: [
        {
          model: TravelTrip,
          as: "receiverTrip",
          where: { host_id: host.id },
          attributes: [
            "id",
            "from_country",
            "from_city",
            "to_country",
            "to_city",
            "travel_date"
          ]
        },
        {
          model: TravelTrip,
          as: "requesterTrip",
          attributes: [
            "id",
            "host_id", // ✅ REQUIRED FOR SELF-FILTER
            "from_country",
            "from_city",
            "to_country",
            "to_city",
            "travel_date"
          ],
          include: [
            {
              model: Host,
              as: "host",
              attributes: ["full_name", "country", "city"],
              include: [
                {
                  model: User,
                  attributes: ["profile_image"]
                }
              ]
            }
          ]
        }
      ],
      order: [["created_at", "DESC"]]
    });

    // 🚫 REMOVE SELF-REQUESTS
    matches = matches.filter(
      m => m.requesterTrip.host_id !== host.id
    );

    // 4️⃣ Shape response
    const requests = matches.map(m => ({
      match_id: m.id,
      status: m.status,
      requested_at: m.created_at,
      receiver_trip: m.receiverTrip,
      requester_trip: {
        ...m.requesterTrip.toJSON(),
        host: {
          full_name: m.requesterTrip.host.full_name,
          country: m.requesterTrip.host.country,
          city: m.requesterTrip.host.city,
          profile_image:
            m.requesterTrip.host.User?.profile_image || null
        }
      }
    }));

    // 5️⃣ Cache
    await setCache(cacheKey, requests, 60);

    return res.json({
      success: true,
      source: "db",
      requests
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   PUBLIC: BROWSE TRAVEL PARTNERS (PRODUCTION SAFE)
   ====================================================== */
export const publicBrowseTrips = async (req, res) => {
  try {
    /* ===============================
       1️⃣ PAGINATION (HARD LIMITS)
       =============================== */
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
    const offset = (page - 1) * limit;

    /* ===============================
       2️⃣ FILTERS (PUBLIC SAFE ONLY)
       =============================== */
    const from_country = req.query.from_country?.trim() || null;
    const to_country = req.query.to_country?.trim() || null;

    // NEVER accept status from client
    const today = new Date().toISOString().slice(0, 10);
    const maxDate = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);

    const where = {
      status: "active", // 🔒 HARD LOCK (DO NOT EXPOSE)
      travel_date: {
        [Op.between]: [today, maxDate]
      }
    };

    if (from_country) where.from_country = from_country;
    if (to_country) where.to_country = to_country;

    /* ===============================
       3️⃣ CACHE KEY (FILTER AWARE)
       =============================== */
    const cacheKey = `travel:public:browse:${from_country || "all"}:${to_country || "all"}:${page}:${limit}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        page,
        results: cached
      });
    }

    /* ===============================
       4️⃣ DATABASE QUERY
       =============================== */
    const trips = await TravelTrip.findAll({
      where,
      limit,
      offset,
      order: [["travel_date", "ASC"]],
      include: [
        {
          model: Host,
          as: "host",
          required: true,
          attributes: ["id", "full_name", "country", "city"],
          include: [
            {
              model: User,
              required: false,
              attributes: ["profile_image", "verified"]
            }
          ]
        }
      ]
    });

    /* ===============================
       5️⃣ RESPONSE SHAPING (STRICT)
       =============================== */
    const results = trips.map(t => {
      const trip = t.toJSON();

      return {
        id: trip.id,
        host_id: trip.host_id, // 🔥 Needed by frontend

        host: {
          id: trip.host.id,
          full_name: trip.host.full_name,
          country: trip.host.country,
          city: trip.host.city,
          profile_image: trip.host.User?.profile_image || null,
          verified: trip.host.User?.verified || false
        },

        trip_meta: {
          age: trip.age ?? null,
          languages: Array.isArray(trip.languages) ? trip.languages : []
        },

        origin: `${trip.from_city}, ${trip.from_country}`,
        from_country: trip.from_country,
        from_city: trip.from_city,

        destination: `${trip.to_city}, ${trip.to_country}`,
        to_country: trip.to_country,
        to_city: trip.to_city,

        date: trip.travel_date,
        time: trip.departure_time,

        flight: {
          airline: trip.airline || null,
          flightNumber: trip.flight_number || null,
          from: trip.from_city,
          to: trip.to_city,
          departureDate: trip.travel_date,
          departureTime: trip.departure_time,
          arrivalDate: trip.arrival_date || null,
          arrivalTime: trip.arrival_time || null
        }
      };
    });

    /* ===============================
       6️⃣ CACHE WRITE
       =============================== */
    await setCache(cacheKey, results, 60);

    return res.json({
      success: true,
      source: "db",
      page,
      results
    });

  } catch (err) {
    console.error("publicBrowseTrips error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const publicSearchTrips = async (req, res) => {
  try {
    const { from_country, to_country, date, page = 1, limit = 10 } = req.query;

    if (!from_country || !to_country || !date) {
      return res.status(400).json({
        message: "from_country, to_country, date required"
      });
    }

    const offset = (page - 1) * limit;

    const trips = await TravelTrip.findAll({
      where: {
        from_country,
        to_country,
        travel_date: date,
        status: "active"
      },
      order: [["travel_date", "ASC"]],
      limit: Number(limit),
      offset,
      include: [
        {
          model: Host,
          as: "host",
          attributes: ["id", "full_name", "country", "city"],
          include: [
            {
              model: User,
              attributes: ["profile_image", "verified"]
            }
          ]
        }
      ]
    });

    const results = trips.map(t => {
      const trip = t.toJSON();

      return {
        id: trip.id,

        host: {
          id: trip.host.id,
          full_name: trip.host.full_name,
          country: trip.host.country,
          city: trip.host.city,
          profile_image: trip.host.User?.profile_image || null,
          verified: trip.host.User?.verified || false
        },

        trip_meta: {
          age: trip.age || null,
          languages: Array.isArray(trip.languages) ? trip.languages : []
        },

        destination: `${trip.to_city}, ${trip.to_country}`,
        date: trip.travel_date,
        time: trip.departure_time
      };
    });
  trackEvent({
  event_type: "TRAVEL_TRIP_SEARCHED",
  actor: req.user ? { user_id: req.user.id } : {},
  metadata: {
    from_country,
    to_country,
    date,
    results_count: trips.length
  }
});



    return res.json({
      success: true,
      page: Number(page),
      results
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const publicTripPreview = async (req, res) => {
  try {
    const { trip_id } = req.params;

    const trip = await TravelTrip.findOne({
      where: { id: trip_id, status: "active" },
      attributes: [
        "id",
        "from_country",
        "from_city",
        "to_country",
        "to_city",
        "travel_date",
        "departure_time",
        "airline"
      ],
      include: [
        {
          model: Host,
          as: "host",
          attributes: ["full_name", "country", "city"]
        }
      ]
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
trackEvent({
  event_type: "TRAVEL_TRIP_VIEWED",
  actor: req.user ? { user_id: req.user.id } : {},
  entity: { type: "travel_trip", id: trip.id },
  location: {
    country: trip.from_country,
    state: null
  }
});



    return res.json({
      success: true,
      trip
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};




//ADMIN CONTROLLERS
/* ======================================================
   ADMIN: GET ALL TRIPS
   ====================================================== */
export const adminGetAllTrips = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const trips = await TravelTrip.findAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Host,
          as: "host",
          attributes: ["id", "full_name", "country", "city"],
          include: [
            {
              model: User,
              attributes: ["email", "verified"]
            }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      page,
      results: trips
    });

  } catch (err) {
    console.error("ADMIN GET TRIPS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN: CANCEL TRIP (CASCADE SAFE)
   ====================================================== */
export const adminCancelTrip = async (req, res) => {
  try {
    const tripId = Number(req.params.trip_id);
    if (!Number.isInteger(tripId) || tripId <= 0) {
      return res.status(400).json({ message: "Invalid Trip ID" });
    }

    const trip = await TravelTrip.findByPk(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.status === "cancelled") {
      return res.status(400).json({ message: "Trip already cancelled" });
    }

    /* ============================
       🔴 TRANSACTION (ATOMIC)
       ============================ */
    await TravelTrip.sequelize.transaction(async (t) => {
      await trip.update(
        { status: "cancelled" },
        { transaction: t }
      );

      await TravelMatch.update(
        { status: "cancelled" },
        {
          where: {
            [Op.or]: [
              { trip_id: trip.id },
              { matched_trip_id: trip.id }
            ]
          },
          transaction: t
        }
      );
    });

    /* ============================
       🔔 ASYNC EMAIL NOTIFICATIONS
       ============================ */

    // 1️⃣ Notify trip owner
    const ownerHost = await Host.findByPk(trip.host_id, {
      include: [{ model: User, attributes: ["email"] }]
    });

    if (ownerHost?.User?.email) {
      notifyAndEmail({
        userId: ownerHost.user_id,
        email: ownerHost.User.email,
        type: "TRAVEL_TRIP_CANCELLED",
        title: "Your trip was cancelled",
        message: "Your travel trip was cancelled by an administrator.",
        metadata: { trip_id: trip.id }
      }).catch(console.error);
    }

    // 2️⃣ Notify other affected hosts (DEDUPED)
    const cancelledMatches = await TravelMatch.findAll({
      where: {
        status: "cancelled",
        [Op.or]: [
          { trip_id: trip.id },
          { matched_trip_id: trip.id }
        ]
      }
    });

    const notifiedHosts = new Set();

    for (const match of cancelledMatches) {
      const otherTripId =
        match.trip_id === trip.id
          ? match.matched_trip_id
          : match.trip_id;

      const otherTrip = await TravelTrip.findByPk(otherTripId);
      if (!otherTrip) continue;

      if (notifiedHosts.has(otherTrip.host_id)) continue;
      notifiedHosts.add(otherTrip.host_id);

      const otherHost = await Host.findByPk(otherTrip.host_id, {
        include: [{ model: User, attributes: ["email"] }]
      });

      if (!otherHost?.User?.email) continue;

      notifyAndEmail({
        userId: otherHost.user_id,
        email: otherHost.User.email,
        type: "TRAVEL_MATCH_CANCELLED",
        title: "Travel match cancelled",
        message:
          "A travel match was cancelled because a related trip was removed by an administrator.",
        metadata: { trip_id: trip.id }
      }).catch(console.error);
    }

    /* ============================
       🔐 AUDIT & ANALYTICS
       ============================ */
    logAudit({
      action: "ADMIN_CANCELLED_TRIP",
      actor: { id: req.admin.id, role: "admin" },
      target: { type: "travel_trip", id: trip.id },
      severity: "HIGH",
      req
    }).catch(console.error);

    trackEvent({
      event_type: "ADMIN_CANCELLED_TRIP",
      actor: { admin_id: req.admin.id },
      entity: { type: "travel_trip", id: trip.id }
    }).catch(console.error);

    /* ============================
       🧹 CACHE INVALIDATION
       ============================ */
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");

    return res.json({
      success: true,
      message: "Trip and related matches cancelled"
    });

  } catch (err) {
    console.error("ADMIN CANCEL TRIP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/* ======================================================
   ADMIN: GET ALL MATCHES
   ====================================================== */
export const adminGetAllMatches = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const matches = await TravelMatch.findAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: TravelTrip,
          as: "requesterTrip",
          attributes: ["id", "from_city", "to_city"]
        },
        {
          model: TravelTrip,
          as: "receiverTrip",
          attributes: ["id", "from_city", "to_city"]
        }
      ]
    });

    return res.json({
      success: true,
      page,
      results: matches
    });

  } catch (err) {
    console.error("ADMIN GET MATCHES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN: CANCEL MATCH
   ====================================================== */
export const adminCancelMatch = async (req, res) => {
  try {
    const matchId = Number(req.params.match_id);
    if (!Number.isInteger(matchId)) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const match = await TravelMatch.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.status === "cancelled") {
      return res.status(400).json({ message: "Match already cancelled" });
    }

    match.status = "cancelled";
    await match.save();

    // 🔐 Audit
    logAudit({
      action: "ADMIN_CANCELLED_MATCH",
      actor: { id: req.admin.id, role: "admin" },
      target: { type: "travel_match", id: match.id },
      severity: "MEDIUM",
      req
    }).catch(console.error);

    // 📊 Analytics
    AnalyticsEvent.create({
      event_type: "ADMIN_CANCELLED_MATCH",
      user_id: req.admin.id
    }).catch(console.error);

    // 🧹 Cache
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");

    return res.json({
      success: true,
      message: "Match cancelled"
    });

  } catch (err) {
    console.error("ADMIN CANCEL MATCH ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   ADMIN: BLOCK HOST (NUCLEAR OPTION)
   ====================================================== */
export const adminBlockHost = async (req, res) => {
  try {
    const hostId = Number(req.params.host_id);
    if (!Number.isInteger(hostId)) {
      return res.status(400).json({ message: "Invalid host id" });
    }

    const host = await Host.findByPk(hostId);
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    // 🔴 Block host
    host.status = "rejected";
    host.rejection_reason = "Blocked by admin";
    await host.save();

    // 🔴 Cancel ALL host trips
    const trips = await TravelTrip.findAll({
      where: { host_id: host.id }
    });

    const tripIds = trips.map(t => t.id);

    await TravelTrip.update(
      { status: "cancelled" },
      { where: { host_id: host.id } }
    );

    // 🔴 Cancel ALL related matches
    if (tripIds.length > 0) {
      await TravelMatch.update(
        { status: "cancelled" },
        {
          where: {
            [Op.or]: [
              { trip_id: tripIds },
              { matched_trip_id: tripIds }
            ]
          }
        }
      );
    }

    // 🔐 Audit
    logAudit({
      action: "ADMIN_BLOCKED_HOST",
      actor: { id: req.admin.id, role: "admin" },
      target: { type: "host", id: host.id },
      severity: "CRITICAL",
      req
    }).catch(console.error);

    // 📊 Analytics
    AnalyticsEvent.create({
      event_type: "HOST_BLOCKED",
      user_id: req.admin.id,
      country: host.country || null
    }).catch(console.error);

    // 🧹 Cache
    await deleteCacheByPrefix("travel:");
    await deleteCacheByPrefix("host:");
    await deleteCacheByPrefix("admin:");

    return res.json({
      success: true,
      message: "Host, trips, and matches blocked"
    });

  } catch (err) {
    console.error("ADMIN BLOCK HOST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
