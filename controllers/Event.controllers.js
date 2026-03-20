import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import EventParticipant from "../model/EventParticipant.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { getIO } from "../services/socket.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";

// ── Helper: Enrich event with Host + User data ─────────────────────
async function enrichEventWithHost(event) {
  const e = { ...event };
  if (e.host_id) {
    const host = await Host.get(e.host_id);
    if (host) {
      const user = await User.get(host.user_id);
      e.Host = {
        id: host.id, full_name: host.full_name, status: host.status,
        user_id: host.user_id, phone: host.phone, email: host.email,
        whatsapp: host.whatsapp, country: host.country, state: host.state, city: host.city,
        facebook: host.facebook, instagram: host.instagram,
        User: user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null
      };
    }
  }
  return e;
}

// ── Helper: Process event images ────────────────────────────────────
function processEventImages(e) {
  if (e.banner_image) e.banner_image = attachCloudFrontUrl(e.banner_image);
  if (e.gallery_images) e.gallery_images = e.gallery_images.map(attachCloudFrontUrl);
  return processHostImages(e);
}

// ======================================================
// 1. CREATE EVENT DRAFT
// ======================================================
export const createEventDraft = async (req, res) => {
  try {
    const userId = req.user.id;

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts?.[0];

    if (!host) {
      return res.status(400).json({
        success: false,
        message: "You must complete host verification before creating events."
      });
    }

    const { title, start_date, start_time, end_date, end_time } = req.body;
    const type = req.body.type || req.body.event_type;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const startDateObj = new Date(start_date);
    if (isNaN(startDateObj)) {
      return res.status(400).json({ message: "Invalid start_date" });
    }

    if (end_date) {
      const endDateObj = new Date(end_date);

      if (isNaN(endDateObj)) {
        return res.status(400).json({ message: "Invalid end_date" });
      }

      if (endDateObj < startDateObj) {
        return res.status(400).json({
          message: "End date cannot be before start date"
        });
      }
    }

    if (
      end_date &&
      start_date === end_date &&
      end_time &&
      start_time >= end_time
    ) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }

    const eventData = {
      host_id: host.id,
      title,
      start_date,
      start_time,
      status: "draft",
      ...(type && { type }),
      ...(end_date && { end_date }),
      ...(end_time && { end_time })
    };

    const event = await Event.create(eventData);

    AnalyticsEvent.create({
      event_type: "EVENT_DRAFT_CREATED",
      user_id: userId,
      host_id: host.id,
      event_id: event.id,
      ...(host.country && { country: host.country }),
      ...(host.state && { state: host.state })
    }).catch(console.error);

    await deleteCacheByPrefix("pending_events:");

    return res.json({
      success: true,
      eventId: event.id
    });

  } catch (err) {
    console.error("CREATE EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 2. UPDATE BASIC INFO
// ======================================================
export const updateBasicInfo = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const type = req.body.type || req.body.event_type;
    const setFields = {};
    const removeFields = [];

    const fields = { title: req.body.title, description: req.body.description, type };

    Object.keys(fields).forEach(key => {
      const val = fields[key];
      if (val === undefined || val === null || val === "") removeFields.push(key);
      else setFields[key] = val;
    });

    const dynamoUpdate = {};
    if (Object.keys(setFields).length > 0) dynamoUpdate.$SET = setFields;
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    if (Object.keys(dynamoUpdate).length > 0) {
      await Event.update({ id: event.id }, dynamoUpdate);
    }

    AnalyticsEvent.create({
      event_type: "EVENT_BASIC_INFO_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id,
      country: event.country, state: event.state, metadata: { step: "basic_info" }
    });

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 3. UPDATE LOCATION
// ======================================================
export const updateLocation = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const setFields = {};
    const removeFields = [];

    const fields = {
      country: req.body.country, state: req.body.state, city: req.body.city,
      street_address: req.body.street_address, landmark: req.body.landmark,
      zip_code: req.body.zip_code
    };

    Object.keys(fields).forEach(key => {
      const val = fields[key];
      if (val === undefined || val === null || val === "") removeFields.push(key);
      else setFields[key] = val;
    });

    const dynamoUpdate = {};
    if (Object.keys(setFields).length > 0) dynamoUpdate.$SET = setFields;
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    if (Object.keys(dynamoUpdate).length > 0) {
      await Event.update({ id: event.id }, dynamoUpdate);
    }

    AnalyticsEvent.create({
      event_type: "EVENT_LOCATION_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id,
      country: req.body.country, state: req.body.state
    });

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 4. UPDATE SCHEDULE
// ======================================================
export const updateSchedule = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const endDate = req.body.end_date !== undefined ? req.body.end_date : event.end_date;
    const endTime = req.body.end_time !== undefined ? req.body.end_time : event.end_time;

    if (endDate && endDate !== "" && new Date(endDate) < new Date(event.start_date)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    if (endDate && endDate !== "" && event.start_date === endDate && endTime && endTime !== "" && event.start_time >= endTime) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const setFields = { schedule: req.body.schedule || event.schedule };
    const removeFields = [];

    if (endDate === "" || endDate === null) removeFields.push("end_date");
    else if (endDate) setFields.end_date = endDate;

    if (endTime === "" || endTime === null) removeFields.push("end_time");
    else if (endTime) setFields.end_time = endTime;

    const dynamoUpdate = { $SET: setFields };
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    await Event.update({ id: event.id }, dynamoUpdate);

    AnalyticsEvent.create({
      event_type: "EVENT_SCHEDULE_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id, country: event.country, state: event.state
    }).catch(console.error);

    await deleteCache(`event:${event.id}`);
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
    console.error("Schedule update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// UPDATE VENUE + WHAT'S INCLUDED
// ======================================================
export const updateVenue = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const { venue_name, venue_description, parking_info, accessibility_info,
      latitude, longitude, google_maps_url, included_items, event_mode, event_url, online_instructions } = req.body;

    // Build the $SET and $REMOVE lists for Dynamoose
    const setFields = {};
    const removeFields = [];

    const fields = {
      venue_name, venue_description, parking_info, accessibility_info,
      google_maps_url, event_mode
    };

    Object.keys(fields).forEach(key => {
      const val = fields[key];
      if (val === undefined || val === null || val === "") removeFields.push(key);
      else setFields[key] = val;
    });

    if (latitude !== undefined && latitude !== null) setFields.latitude = latitude;
    if (longitude !== undefined && longitude !== null) setFields.longitude = longitude;
    if (included_items) setFields.included_items = included_items;

    if (event_mode === "online" || event_mode === "hybrid") {
      if (event_url) setFields.event_url = event_url;
      if (online_instructions) setFields.online_instructions = online_instructions;
    } else {
      removeFields.push("event_url", "online_instructions");
    }

    if (event_mode === "online") {
      removeFields.push("venue_name", "venue_description", "parking_info", "accessibility_info", "google_maps_url");
      // latitude & longitude are Number type, safe to set to 0
      setFields.latitude = 0;
      setFields.longitude = 0;
    }

    const dynamoUpdate = {};
    if (Object.keys(setFields).length > 0) dynamoUpdate.$SET = setFields;
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    AnalyticsEvent.create({
      event_type: "EVENT_VENUE_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id, country: event.country, state: event.state
    });

    if (Object.keys(dynamoUpdate).length > 0) {
      await Event.update({ id: event.id }, dynamoUpdate);
    }

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    const updated = await Event.get(event.id);
    return res.json({ success: true, message: "Venue and event mode updated successfully", event: updated });
  } catch (err) {
    console.error("Update venue error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 5. UPDATE MEDIA
// ======================================================
export const updateMedia = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ message: "Event not found" });

    const updateData = {};
    if (req.files?.bannerImage) {
      updateData.banner_image = req.files.bannerImage[0].location;
    }
    if (req.files?.galleryImages) {
      const newGalleryImages = req.files.galleryImages.map(f => f.location);
      updateData.gallery_images = [...(event.gallery_images || []), ...newGalleryImages];
    }

    await Event.update({ id: event.id }, updateData);

    AnalyticsEvent.create({
      event_type: "EVENT_MEDIA_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id, country: event.country, state: event.state
    });

    await deleteCache(`event:${event.id}`);
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
    console.log("Media update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 6. UPDATE PRICING
// ======================================================
export const updatePricing = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await Event.update({ id: event.id }, { price: req.body.price });

    AnalyticsEvent.create({
      event_type: "EVENT_PRICING_UPDATED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id, country: event.country, state: event.state
    });

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 7. SUBMIT EVENT FOR ADMIN APPROVAL
// ======================================================
export const submitEvent = async (req, res) => {
  try {
    const event = req.event;
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.end_date && new Date(event.end_date) < new Date(event.start_date)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    if (event.end_date && event.start_date === event.end_date && event.end_time && event.start_time >= event.end_time) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await Event.update({ id: event.id }, { status: "pending" });

    AnalyticsEvent.create({
      event_type: "EVENT_SUBMITTED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id, country: event.country, state: event.state
    });

    await deleteCacheByPrefix("pending_events:");
    return res.json({ success: true, message: "Event submitted to admin." });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: GET PENDING EVENTS + HOSTS
// ======================================================
export const getPendingItems = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `pending_events:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    // Query events by status GSI
    let pendingEvents = await Event.query("status").eq("pending").exec();
    if (country) pendingEvents = pendingEvents.filter(e => e.country === country);
    if (state) pendingEvents = pendingEvents.filter(e => e.state === state);
    pendingEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Enrich with Host + User data
    const processedEvents = await Promise.all(pendingEvents.map(async event => {
      let e = await enrichEventWithHost(event);
      return processEventImages(e);
    }));

    // Query hosts by status GSI
    let pendingHosts = await Host.query("status").eq("pending").exec();
    if (country) pendingHosts = pendingHosts.filter(h => h.country === country);
    if (state) pendingHosts = pendingHosts.filter(h => h.state === state);
    pendingHosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const processedHosts = await Promise.all(pendingHosts.map(async host => {
      const h = { ...host };
      const user = await User.get(h.user_id);
      h.User = user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null;
      return processHostImages(h);
    }));

    const result = { events: processedEvents, hosts: processedHosts };
    await setCache(cacheKey, result, 300);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const cacheKey = "admin:dashboard:stats";
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, stats: cached });

    const [allEvents, allHosts, allUsers] = await Promise.all([
      Event.scan().exec(),
      Host.scan().exec(),
      User.scan().exec()
    ]);

    const stats = {
      events: {
        total: allEvents.length,
        approved: allEvents.filter(e => e.status === "approved" && !e.is_deleted).length,
        pending: allEvents.filter(e => e.status === "pending" && !e.is_deleted).length,
        rejected: allEvents.filter(e => e.status === "rejected" && !e.is_deleted).length,
        deleted: allEvents.filter(e => e.is_deleted).length
      },
      hosts: {
        total: allHosts.length,
        pending: allHosts.filter(h => h.status === "pending").length
      },
      users: { total: allUsers.length }
    };

    await setCache(cacheKey, stats, 300);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error("ADMIN DASHBOARD STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// APPROVE EVENT
// ======================================================
export const approveEvent = async (req, res) => {
  try {
    const event = await Event.get(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.status === "approved") return res.status(400).json({ message: "Event already approved" });

    await Event.update({ id: event.id }, { status: "approved", rejection_reason: "" });

    AnalyticsEvent.create({
      event_type: "EVENT_APPROVED", user_id: req.admin?.id || null,
      host_id: event.host_id, event_id: event.id,
      country: event.country, state: event.state, metadata: { actor: "admin" }
    });

    await deleteCacheByPrefix(`host_events:${event.host_id}`);
    await deleteCacheByPrefix("pending_events");
    await deleteCacheByPrefix("approved_events");
    await deleteCache(`event:${event.id}`);

    // Notify host
    try {
      const host = await Host.get(event.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({
            userId: host.user_id, email: user.email,
            type: NOTIFICATION_TYPES.EVENT_APPROVED,
            title: "Event approved",
            message: "Your event has been approved and is now live.",
            metadata: { eventId: event.id, title: event.title }
          });
        }
      }
    } catch (err) { console.error("Failed to notify user:", err); }

    return res.json({ success: true, message: "Event approved" });
  } catch (err) {
    console.error("APPROVE EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// REJECT EVENT
// ======================================================
export const rejectEvent = async (req, res) => {
  try {
    const event = await Event.get(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.status === "rejected") return res.status(400).json({ message: "Event already rejected" });

    const rejection_reason = req.body.reason || "";
    await Event.update({ id: event.id }, { status: "rejected", rejection_reason });

    AnalyticsEvent.create({
      event_type: "EVENT_REJECTED", user_id: req.admin?.id || null,
      host_id: event.host_id, event_id: event.id,
      country: event.country, state: event.state, metadata: { reason: rejection_reason }
    });

    await deleteCacheByPrefix(`host_events:${event.host_id}`);
    await deleteCacheByPrefix("pending_events:");
    await deleteCache(`event:${event.id}`);

    try {
      const host = await Host.get(event.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({
            userId: host.user_id, email: user.email,
            type: NOTIFICATION_TYPES.EVENT_REJECTED,
            title: "Event rejected",
            message: "Your event was rejected. Please review the reason.",
            metadata: { eventId: event.id, title: event.title, reason: rejection_reason }
          });
        }
      }
    } catch (err) { console.error("Failed to notify user:", err); }

    return res.json({ success: true, message: "Event rejected" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// PUBLIC: GET APPROVED EVENTS (Homepage)
// ======================================================
export const getApprovedEvents = async (req, res) => {
  try {
    const country = req.headers["x-country"] || req.query.country || null;
    const state = req.headers["x-state"] || req.query.state || null;
    const city = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;

    const cacheKey = `approved_events:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, events: cached });

    // Query by status GSI
    let events = await Event.query("status").eq("approved").exec();

    // Client-side filtering
    if (country) events = events.filter(e => e.country === country);
    if (state) events = events.filter(e => e.state === state);
    if (city) events = events.filter(e => e.city === city);
    if (zip_code) events = events.filter(e => e.zip_code === zip_code);

    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const processedEvents = await Promise.all(events.map(async event => {
      let e = await enrichEventWithHost(event);
      return processEventImages(e);
    }));

    await setCache(cacheKey, processedEvents, 300);
    return res.json({ success: true, events: processedEvents });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// HOST: GET MY EVENTS
// ======================================================
export const getMyEvents = async (req, res) => {
  try {
    const hosts = await Host.query("user_id").eq(req.user.id).exec();
    const host = hosts[0];

    if (!host) {
      return res.status(400).json({ success: false, message: "You are not a host." });
    }

    const cacheKey = `host_events:${host.id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, events: cached });

    // Query by host_id GSI
    let events = await Event.query("host_id").eq(host.id).exec();
    events = events.filter(e => !e.is_deleted);
    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const processedEvents = events.map(event => {
      const e = { ...event };
      if (e.banner_image) e.banner_image = attachCloudFrontUrl(e.banner_image);
      if (e.gallery_images) e.gallery_images = e.gallery_images.map(attachCloudFrontUrl);
      return e;
    });

    await setCache(cacheKey, processedEvents, 300);
    return res.json({ success: true, events: processedEvents });
  } catch (err) {
    console.error("GET MY EVENTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// GET SINGLE EVENT DETAILS
// ======================================================
export const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    if (!eventId) return res.status(400).json({ message: "Invalid event id" });

    const cacheKey = `event:${eventId}`;
    let eventData;

    const cached = await getCache(cacheKey);
    if (cached) {
      eventData = JSON.parse(JSON.stringify(cached));
    } else {
      const event = await Event.get(eventId);
      if (!event || event.status !== "approved" || event.is_deleted) {
        return res.status(404).json({ message: "Event not found" });
      }

      eventData = await enrichEventWithHost(event);
      await setCache(cacheKey, eventData, 300);

      AnalyticsEvent.create({
        event_type: "EVENT_VIEWED", user_id: req.user?.id || null,
        event_id: event.id,
        country: req.headers["x-country"] || event.country,
        state: req.headers["x-state"] || event.state
      }).catch(console.error);
    }

    // User-specific flag
    let isRegistered = false;
    if (req.user?.id) {
      const participants = await EventParticipant.query("event_id").eq(eventId).exec();
      isRegistered = participants.some(p => p.user_id === req.user.id);
    }

    if (eventData.Host?.User) {
      eventData.Host.User.email = eventData.Host.User.email || "";
      eventData.Host.User.profile_image = eventData.Host.User.profile_image || null;
    }

    eventData = processEventImages(eventData);

    return res.json({ success: true, event: eventData, is_registered: isRegistered });
  } catch (err) {
    console.error("GET EVENT BY ID ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// JOIN EVENT
// ======================================================
export const joinEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.get(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Efficient check (requires GSI)
    const existing = await EventParticipant
      .query("event_id")
      .eq(eventId)
      .where("user_id")
      .eq(userId)
      .exec();

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Already joined"
      });
    }

    await EventParticipant.create({
      event_id: eventId,
      user_id: userId
    });

    // Atomic increment
    await Event.update(
      { id: eventId },
      { $ADD: { attendees_count: 1 } }
    );

    AnalyticsEvent.create({
      event_type: "EVENT_JOINED",
      user_id: userId,
      event_id: eventId,
      host_id: event.host_id
    }).catch(console.error);

    await deleteCache(`event:${eventId}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);

    return res.json({
      success: true,
      message: "Joined event"
    });

  } catch (err) {
    console.error("JOIN EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// LEAVE EVENT
// ======================================================
export const leaveEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const existing = await EventParticipant
      .query("event_id")
      .eq(eventId)
      .where("user_id")
      .eq(userId)
      .exec();

    if (existing.length === 0) {
      return res.status(400).json({
        message: "You have not joined this event"
      });
    }

    await EventParticipant.delete(existing[0].id);

    const event = await Event.get(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Atomic decrement with guard
    if ((event.attendees_count || 0) > 0) {
      await Event.update(
        { id: eventId },
        { $ADD: { attendees_count: -1 } }
      );
    }

    AnalyticsEvent.create({
      event_type: "EVENT_LEFT",
      user_id: userId,
      event_id: eventId,
      host_id: event.host_id
    }).catch(console.error);

    await deleteCache(`event:${eventId}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);

    return res.json({
      success: true,
      message: "Left event"
    });

  } catch (err) {
    console.error("LEAVE EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// HOST: SOFT DELETE EVENT
// ======================================================
export const softDeleteEvent = async (req, res) => {
  try {
    const event = await Event.get(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (event.is_deleted) return res.status(400).json({ success: false, message: "Event already deleted" });

    await Event.update({ id: event.id }, { is_deleted: true });

    AnalyticsEvent.create({
      event_type: "EVENT_DELETED", user_id: req.user.id,
      host_id: event.host_id, event_id: event.id,
      country: event.country, state: event.state
    });

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix("pending_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);

    return res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    console.error("DELETE EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: APPROVED EVENTS
// ======================================================
export const getAdminApprovedEvents = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `admin:events:approved:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, events: cached });

    let events = await Event.query("status").eq("approved").exec();
    events = events.filter(e => !e.is_deleted);
    if (country) events = events.filter(e => e.country === country);
    if (state) events = events.filter(e => e.state === state);
    events.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const plain = await Promise.all(events.map(async event => {
      let e = await enrichEventWithHost(event);
      return processEventImages(e);
    }));

    await setCache(cacheKey, plain, 300);
    return res.json({ success: true, events: plain });
  } catch (err) {
    console.error("ADMIN APPROVED EVENTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: REJECTED EVENTS
// ======================================================
export const getAdminRejectedEvents = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `admin:events:rejected:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, events: cached });

    let events = await Event.query("status").eq("rejected").exec();
    events = events.filter(e => !e.is_deleted);
    if (country) events = events.filter(e => e.country === country);
    if (state) events = events.filter(e => e.state === state);
    events.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const plain = await Promise.all(events.map(async event => {
      let e = await enrichEventWithHost(event);
      return processEventImages(e);
    }));

    await setCache(cacheKey, plain, 300);
    return res.json({ success: true, events: plain });
  } catch (err) {
    console.error("ADMIN REJECTED EVENTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};