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
import Joi from "joi";

// ======================================================
// STRICT JOI VALIDATION SCHEMAS (Scale Fix)
// ======================================================
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const VALID_EVENT_TYPES = ["public", "private", "festival", "meetup", "party", "music", "sports", "conference", "workshop", "charity", "networking", "cultural", "other"];
const VALID_EVENT_MODES = ["in-person", "offline", "online", "hybrid"];

const createEventDraftSchema = Joi.object({
  title: Joi.string().trim().required(),
  type: Joi.string().trim().valid(...VALID_EVENT_TYPES).optional(),
  start_date: Joi.string().isoDate().required(),
  start_time: Joi.string().pattern(timePattern).required(),
  end_date: Joi.string().isoDate().allow("").optional(),
  end_time: Joi.string().pattern(timePattern).allow("").optional()
});

const eventBasicInfoSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim().allow("").optional(),
  type: Joi.string().trim().valid(...VALID_EVENT_TYPES).optional(),
  event_type: Joi.string().trim().valid(...VALID_EVENT_TYPES).optional()
});

const eventLocationSchema = Joi.object({
  country: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  city: Joi.string().trim().optional(),
  street_address: Joi.string().trim().allow("").optional(),
  landmark: Joi.string().trim().allow("").optional(),
  zip_code: Joi.string().trim().allow("").optional()
});

const eventScheduleSchema = Joi.object({
  end_date: Joi.string().isoDate().allow("").optional(),
  end_time: Joi.string().pattern(timePattern).allow("").optional(),
  schedule: Joi.any().optional()
});

const eventVenueSchema = Joi.object({
  venue_name: Joi.string().trim().allow("").optional(),
  venue_description: Joi.string().trim().allow("").optional(),
  parking_info: Joi.string().trim().allow("").optional(),
  accessibility_info: Joi.string().trim().allow("").optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  google_maps_url: Joi.string().uri().allow("").optional(),
  included_items: Joi.array().items(Joi.string()).optional(),
  event_mode: Joi.string().valid(...VALID_EVENT_MODES).optional(),
  event_url: Joi.string().uri().allow("").optional(),
  online_instructions: Joi.string().trim().allow("").optional()
});

const eventPricingSchema = Joi.object({
  price: Joi.number().min(0).required()
});

// ======================================================
// HELPER: CENTRAL CACHE INVALIDATOR (Precision Invalidations)
// ======================================================
async function invalidateEventCaches(event, options = {}) {
  try {
    const promises = [];
    if (event?.id) promises.push(deleteCache(`event:${event.id}`));
    if (event?.host_id) promises.push(deleteCacheByPrefix(`host_events:${event.host_id}`));
    
    // Only blast list caches if specifically requested (e.g. status changed, new event, hard delete)
    if (options.clearLists) {
      promises.push(deleteCacheByPrefix("approved_events:"));
      promises.push(deleteCacheByPrefix("pending_events:"));
    }
    await Promise.all(promises);
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
}

// ── Helper: Batch Enrich events with Host + User data (BatchGet)
async function enrichEventsWithHosts(events) {
  if (!events || events.length === 0) return [];
  const hostIds = [...new Set(events.filter(e => e.host_id).map(e => e.host_id))];

  let hostMap = {};
  if (hostIds.length > 0) {
    const hosts = await Host.batchGet(hostIds);
    const userIds = [...new Set(hosts.filter(h => h && h.user_id).map(h => h.user_id))];

    let userMap = {};
    if (userIds.length > 0) {
      const users = await User.batchGet(userIds);
      for (const u of users) {
        if (u) userMap[u.id] = u;
      }
    }

    for (const h of hosts) {
      if (!h) continue;
      const u = userMap[h.user_id];
      hostMap[h.id] = {
        id: h.id, full_name: h.full_name, status: h.status,
        user_id: h.user_id, phone: h.phone, email: h.email,
        whatsapp: h.whatsapp, country: h.country, state: h.state, city: h.city,
        facebook: h.facebook, instagram: h.instagram,
        User: u ? { id: u.id, email: u.email, profile_image: u.profile_image } : null
      };
    }
  }

  return events.map(event => {
    const e = { ...event };
    if (e.host_id && hostMap[e.host_id]) e.Host = hostMap[e.host_id];
    return e;
  });
}

// ── Helper: Process event images
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

    const { error, value } = createEventDraftSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { title, type, start_date, start_time, end_date, end_time } = value;

    if (end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: "Invalid end date" });
    }

    if (end_date && start_date === end_date && end_time && start_time >= end_time) {
      return res.status(400).json({ message: "Invalid end time" });
    }

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts?.[0];

    if (!host) {
      return res.status(400).json({ success: false, message: "Complete host verification first" });
    }

    const event = await Event.create({
      host_id: host.id,
      host_user_id: userId,
      title,
      type,
      start_date,
      start_time,
      end_date: end_date || null,
      end_time: end_time || null,
      status: "draft",
      attendees_count: 0
    });

    AnalyticsEvent.create({ event_type: "EVENT_DRAFT_CREATED", user_id: userId, host_id: host.id, event_id: event.id }).catch(console.error);

    await invalidateEventCaches(event, { clearLists: true });

    return res.json({ success: true, eventId: event.id });
  } catch (err) {
    console.error("CREATE EVENT DRAFT ERROR:", err);
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this event" });
    }

    const { error, value } = eventBasicInfoSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const type = value.type || value.event_type;
    const setFields = {};
    const removeFields = [];

    const fields = { title: value.title, description: value.description, type };

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

    AnalyticsEvent.create({ event_type: "EVENT_BASIC_INFO_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }), metadata: { step: "basic_info" } }).catch(console.error);

    // Minor update, just clear targeted caches (not sweeping list caches)
    await invalidateEventCaches(event, { clearLists: false });
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this event" });
    }

    const { error, value } = eventLocationSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const setFields = {};
    const removeFields = [];

    const fields = { country: value.country, state: value.state, city: value.city, street_address: value.street_address, landmark: value.landmark, zip_code: value.zip_code };

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

    AnalyticsEvent.create({ event_type: "EVENT_LOCATION_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(value.country && { country: value.country }), ...(value.state && { state: value.state }) }).catch(console.error);

    await invalidateEventCaches(event, { clearLists: false });
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this event" });
    }

    const { error, value } = eventScheduleSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const endDate = value.end_date !== undefined ? value.end_date : event.end_date;
    const endTime = value.end_time !== undefined ? value.end_time : event.end_time;

    if (endDate && endDate !== "" && new Date(endDate) < new Date(event.start_date)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    if (endDate && endDate !== "" && event.start_date === endDate && endTime && endTime !== "" && event.start_time >= endTime) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const setFields = { schedule: value.schedule || event.schedule };
    const removeFields = [];

    if (endDate === "" || endDate === null) removeFields.push("end_date");
    else if (endDate) setFields.end_date = endDate;

    if (endTime === "" || endTime === null) removeFields.push("end_time");
    else if (endTime) setFields.end_time = endTime;

    const dynamoUpdate = { $SET: setFields };
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    await Event.update({ id: event.id }, dynamoUpdate);

    AnalyticsEvent.create({ event_type: "EVENT_SCHEDULE_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    await invalidateEventCaches(event, { clearLists: false });
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this event" });
    }

    const { error, value } = eventVenueSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { venue_name, venue_description, parking_info, accessibility_info, latitude, longitude, google_maps_url, included_items, event_mode, event_url, online_instructions } = value;

    const setFields = {};
    const removeFields = [];

    const fields = { venue_name, venue_description, parking_info, accessibility_info, google_maps_url, event_mode };

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
      setFields.latitude = 0;
      setFields.longitude = 0;
    }

    const dynamoUpdate = {};
    if (Object.keys(setFields).length > 0) dynamoUpdate.$SET = setFields;
    if (removeFields.length > 0) dynamoUpdate.$REMOVE = removeFields;

    AnalyticsEvent.create({ event_type: "EVENT_VENUE_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    if (Object.keys(dynamoUpdate).length > 0) await Event.update({ id: event.id }, dynamoUpdate);

    await invalidateEventCaches(event, { clearLists: false });
    const updated = await Event.get(event.id);
    return res.json({ success: true, message: "Venue and event mode updated successfully", event: updated });
  } catch (err) {
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateData = {};
    if (req.files?.bannerImage) {
      updateData.banner_image = req.files.bannerImage[0].location;
    }
    if (req.files?.galleryImages) {
      const newGalleryImages = req.files.galleryImages.map(f => f.location);
      updateData.gallery_images = [...(event.gallery_images || []), ...newGalleryImages];
    }

    await Event.update({ id: event.id }, updateData);

    AnalyticsEvent.create({ event_type: "EVENT_MEDIA_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    await invalidateEventCaches(event, { clearLists: false });
    const updated = await Event.get(event.id);
    return res.json({ success: true, event: updated });
  } catch (err) {
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { error, value } = eventPricingSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    await Event.update({ id: event.id }, { price: value.price });

    AnalyticsEvent.create({ event_type: "EVENT_PRICING_UPDATED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    await invalidateEventCaches(event, { clearLists: false });
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

    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (event.end_date && new Date(event.end_date) < new Date(event.start_date)) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    if (event.end_date && event.start_date === event.end_date && event.end_time && event.start_time >= event.end_time) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await Event.update({ id: event.id }, { status: "pending" });

    AnalyticsEvent.create({ event_type: "EVENT_SUBMITTED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    // Status changed to pending! Must clear lists
    await invalidateEventCaches(event, { clearLists: true });
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
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Hard CAP limits to 50
    const { country, state } = req.query;
    const eventsStartAt = req.query.eventsStartAt ? JSON.parse(req.query.eventsStartAt) : undefined;
    const hostsStartAt = req.query.hostsStartAt ? JSON.parse(req.query.hostsStartAt) : undefined;

    const cacheKey = (!eventsStartAt && !hostsStartAt) ? `pending_events:${country || "all"}:${state || "all"}:${limit}` : null;
    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json({ success: true, ...cached });
    }

    let qEvents = Event.query("status").eq("pending").sort("descending").limit(limit);
    if (eventsStartAt) qEvents = qEvents.startAt(eventsStartAt);
    if (country) qEvents = qEvents.where("country").eq(country);
    if (state) qEvents = qEvents.where("state").eq(state);

    const pendingEvents = await qEvents.exec();
    const enrichedEvents = await enrichEventsWithHosts(pendingEvents);
    const processedEvents = enrichedEvents.map(processEventImages);

    let qHosts = Host.query("status").eq("pending").sort("descending").limit(limit);
    if (hostsStartAt) qHosts = qHosts.startAt(hostsStartAt);
    if (country) qHosts = qHosts.where("country").eq(country);
    if (state) qHosts = qHosts.where("state").eq(state);

    const pendingHosts = await qHosts.exec();

    const userIds = [...new Set(pendingHosts.map(h => h.user_id))];
    
    let userMap = {};
    if (userIds.length > 0) {
      const users = await User.batchGet(userIds);
      for (const u of users) {
         if (u) userMap[u.id] = u;
      }
    }

    const processedHosts = pendingHosts.map(host => {
      const h = { ...host };
      const user = userMap[h.user_id];
      h.User = user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null;
      return processHostImages(h);
    });

    const result = { events: processedEvents, hosts: processedHosts, eventsLastKey: pendingEvents.lastKey, hostsLastKey: pendingHosts.lastKey };
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

    const [approved, pending, rejected] = await Promise.all([
      Event.query("status").eq("approved").count().exec(),
      Event.query("status").eq("pending").count().exec(),
      Event.query("status").eq("rejected").count().exec()
    ]);

    const stats = { events: { approved: approved.count || 0, pending: pending.count || 0, rejected: rejected.count || 0 } };

    await setCache(cacheKey, stats, 300);
    return res.json({ success: true, stats });
  } catch (err) {
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

    AnalyticsEvent.create({ event_type: "EVENT_APPROVED", user_id: req.admin?.id || null, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }), metadata: { actor: "admin" } }).catch(console.error);

    // Status changed, must clear list caches
    await invalidateEventCaches(event, { clearLists: true });

    try {
      const host = await Host.get(event.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({ userId: host.user_id, email: user.email, type: NOTIFICATION_TYPES.EVENT_APPROVED, title: "Event approved", message: "Your event has been approved and is now live.", metadata: { eventId: event.id, title: event.title } });
        }
      }
    } catch (err) { console.error("Failed to notify user:", err); }

    return res.json({ success: true, message: "Event approved" });
  } catch (err) {
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

    AnalyticsEvent.create({ event_type: "EVENT_REJECTED", user_id: req.admin?.id || null, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }), metadata: { reason: rejection_reason } }).catch(console.error);

    // Status changed, sweep list caches
    await invalidateEventCaches(event, { clearLists: true });

    try {
      const host = await Host.get(event.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({ userId: host.user_id, email: user.email, type: NOTIFICATION_TYPES.EVENT_REJECTED, title: "Event rejected", message: "Your event was rejected. Please review the reason.", metadata: { eventId: event.id, title: event.title, reason: rejection_reason } });
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
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Hard CAP
    const startAt = req.query.startAt ? JSON.parse(req.query.startAt) : undefined;
    
    const cacheKey = startAt ? null : `approved_events:${limit}`;
    
    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json({ success: true, events: cached });
    }

    let query = Event.query("status").eq("approved").where("is_deleted").eq(false).limit(limit).sort("descending");
    if (startAt) query = query.startAt(startAt);

    const result = await query.exec();
    const enriched = await enrichEventsWithHosts(result);
    const processedEvents = enriched.map(processEventImages);

    if (cacheKey) await setCache(cacheKey, processedEvents, 300);

    return res.json({ success: true, events: processedEvents, lastKey: result.lastKey });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// HOST: GET MY EVENTS
// ======================================================
export const getMyEvents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Hard CAP
    const hosts = await Host.query("user_id").eq(req.user.id).exec();
    const host = hosts[0];

    if (!host) {
      return res.status(400).json({ success: false, message: "You are not a host." });
    }

    const startAt = req.query.startAt ? JSON.parse(req.query.startAt) : undefined;
    const cacheKey = startAt ? null : `host_events:${host.id}:${limit}`;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json({ success: true, events: cached });
    }

    let q = Event.query("host_id").eq(host.id).sort("descending").limit(limit);
    if (startAt) q = q.startAt(startAt);
    q = q.where("is_deleted").eq(false);

    let events = await q.exec();

    const processedEvents = events.map(event => {
      const e = { ...event };
      if (e.banner_image) e.banner_image = attachCloudFrontUrl(e.banner_image);
      if (e.gallery_images) e.gallery_images = e.gallery_images.map(attachCloudFrontUrl);
      return e;
    });

    if (cacheKey) await setCache(cacheKey, processedEvents, 300);
    return res.json({ success: true, events: processedEvents, lastKey: events.lastKey });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// GET SINGLE EVENT DETAILS
// ======================================================
export const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    const cacheKey = `event:${eventId}`;
    let eventData = await getCache(cacheKey);

    if (!eventData) {
      let event = await Event.get(eventId);

      if (!event || event.status !== "approved" || event.is_deleted) {
        return res.status(404).json({ message: "Event not found" });
      }

      eventData = (await enrichEventsWithHosts([event]))[0];
      eventData = processEventImages(eventData);

      await setCache(cacheKey, eventData, 300);
      
      AnalyticsEvent.create({ event_type: "EVENT_VIEWED", user_id: req.user?.id || null, event_id: event.id, ...((req.headers["x-country"] || event.country) && { country: req.headers["x-country"] || event.country }), ...((req.headers["x-state"] || event.state) && { state: req.headers["x-state"] || event.state }) }).catch(console.error);
    }

    let isRegistered = false;

    if (req.user?.id) {
      const participant = await EventParticipant.get({ event_id: eventId, user_id: req.user.id });
      isRegistered = !!participant;
    }

    return res.json({ success: true, event: eventData, is_registered: isRegistered });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// JOIN EVENT (Scale Fix: Race Condition Locked)
// ======================================================
export const joinEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Strict condition write
    try {
      await EventParticipant.create(
        { event_id: eventId, user_id: userId },
        { condition: "attribute_not_exists(event_id) AND attribute_not_exists(user_id)" }
      );
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException" || err.code === "ConditionalCheckFailedException") {
        return res.status(400).json({ message: "Already joined" });
      }
      throw err;
    }

    const updated = await Event.update({ id: eventId }, { $ADD: { attendees_count: 1 } }, { return: "document" });
    const newCount = updated.attendees_count;

    AnalyticsEvent.create({ event_type: "EVENT_JOINED", user_id: userId, event_id: eventId }).catch(console.error);

    // Minor update, target event detail cache
    await invalidateEventCaches({ id: eventId }, { clearLists: false });

    if ([1, 10, 25, 50, 100].includes(newCount)) {
      const event = await Event.get(eventId);
      notifyAndEmail({ userId: event.host_user_id, type: "EVENT_MILESTONE", title: "Event update", message: `${newCount} people joined your event`, metadata: { eventId } }).catch(console.error);
    }

    return res.json({ success: true, attendees_count: newCount });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// LEAVE EVENT (Scale Fix: Race Condition Locked)
// ======================================================
export const leaveEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Strict condition delete
    try {
      await EventParticipant.delete(
        { event_id: eventId, user_id: userId },
        { condition: "attribute_exists(user_id)" }
      );
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException" || err.code === "ConditionalCheckFailedException") {
        return res.status(400).json({ message: "Not joined" });
      }
      throw err;
    }

    const updated = await Event.update({ id: eventId }, { $ADD: { attendees_count: -1 } }, { return: "document" });
    const newCount = Math.max(updated.attendees_count || 0, 0);

    AnalyticsEvent.create({ event_type: "EVENT_LEFT", user_id: userId, event_id: eventId }).catch(console.error);

    // Minor update, target event detail cache
    await invalidateEventCaches({ id: eventId }, { clearLists: false });

    if ([0, 9, 24, 49].includes(newCount)) {
      const event = await Event.get(eventId);
      notifyAndEmail({ userId: event.host_user_id, type: "EVENT_LEAVE_MILESTONE", title: "Event update", message: newCount === 0 ? "Your event now has no attendees" : `Attendees dropped to ${newCount}`, metadata: { eventId } }).catch(console.error);
    }

    return res.json({ success: true, attendees_count: newCount });
  } catch (err) {
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
    
    if (event.host_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (event.is_deleted) return res.status(400).json({ success: false, message: "Event already deleted" });

    await Event.update({ id: event.id }, { is_deleted: true });

    AnalyticsEvent.create({ event_type: "EVENT_DELETED", user_id: req.user.id, host_id: event.host_id, event_id: event.id, ...(event.country && { country: event.country }), ...(event.state && { state: event.state }) }).catch(console.error);

    // Event missing, fully flush lists
    await invalidateEventCaches(event, { clearLists: true });

    return res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: APPROVED EVENTS
// ======================================================
export const getAdminApprovedEvents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Hard CAP
    const { country, state } = req.query;
    const startAt = req.query.startAt ? JSON.parse(req.query.startAt) : undefined;
    const cacheKey = startAt ? null : `admin:events:approved:${country || "all"}:${state || "all"}:${limit}`;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json({ success: true, events: cached });
    }

    let q = Event.query("status").eq("approved").sort("descending").limit(limit);
    if (startAt) q = q.startAt(startAt);
    q = q.where("is_deleted").eq(false);
    if (country) q = q.where("country").eq(country);
    if (state) q = q.where("state").eq(state);

    let events = await q.exec();

    const enriched = await enrichEventsWithHosts(events);
    const plain = enriched.map(processEventImages);

    if (cacheKey) await setCache(cacheKey, plain, 300);
    return res.json({ success: true, events: plain, lastKey: events.lastKey });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: REJECTED EVENTS
// ======================================================
export const getAdminRejectedEvents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Hard CAP
    const { country, state } = req.query;
    const startAt = req.query.startAt ? JSON.parse(req.query.startAt) : undefined;
    const cacheKey = startAt ? null : `admin:events:rejected:${country || "all"}:${state || "all"}:${limit}`;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json({ success: true, events: cached });
    }

    let q = Event.query("status").eq("rejected").sort("descending").limit(limit);
    if (startAt) q = q.startAt(startAt);
    q = q.where("is_deleted").eq(false);
    if (country) q = q.where("country").eq(country);
    if (state) q = q.where("state").eq(state);

    let events = await q.exec();

    const enriched = await enrichEventsWithHosts(events);
    const plain = enriched.map(processEventImages);

    if (cacheKey) await setCache(cacheKey, plain, 300);
    return res.json({ success: true, events: plain, lastKey: events.lastKey });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};