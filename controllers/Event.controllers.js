import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import EventParticipant from "../model/EventParticipant.js";
import { createNotification } from "../services/notificationService.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// ======================================================
// 1. CREATE EVENT DRAFT (AUTO HOST CREATION)
// ======================================================
export const createEventDraft = async (req, res) => {
  try {
    const userId = req.user.id;

    let host = await Host.findOne({ where: { user_id: userId } });

    if (!host) {
      host = await Host.create({
        user_id: userId,
        status: "approved"
      });
    }

    const { title, type, start_date, start_time } = req.body;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "title, start_date and start_time are required"
      });
    }

    const event = await Event.create({
      host_id: host.id,
      title,
      type,
      start_date,
      start_time,
      status: "draft"
    });

    await deleteCache("pending_events");

    return res.json({
      success: true,
      eventId: event.id,
      message: "Event draft created"
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
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.update({
      title: req.body.title,
      description: req.body.description,
      type: req.body.type
    });

    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 3. UPDATE LOCATION
// ======================================================
export const updateLocation = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.update({
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      zip_code: req.body.zip_code || null,
      street_address: req.body.street_address,
      landmark: req.body.landmark
    });

    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 4. UPDATE SCHEDULE
// ======================================================
export const updateSchedule = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.update({
      schedule: req.body.schedule || []
    });

    await deleteCache(`event:${event.id}`);
    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 5. UPDATE VENUE + MODE
// ======================================================
export const updateVenue = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const {
      venue_name,
      venue_description,
      parking_info,
      accessibility_info,
      latitude,
      longitude,
      google_maps_url,
      included_items,
      event_mode,
      event_url,
      online_instructions
    } = req.body;

    const updateData = {
      venue_name,
      venue_description,
      parking_info,
      accessibility_info,
      latitude,
      longitude,
      google_maps_url,
      included_items,
      event_mode
    };

    if (event_mode === "online" || event_mode === "hybrid") {
      updateData.event_url = event_url;
      updateData.online_instructions = online_instructions;
    } else {
      updateData.event_url = null;
      updateData.online_instructions = null;
    }

    if (event_mode === "online") {
      updateData.venue_name = null;
      updateData.venue_description = null;
      updateData.parking_info = null;
      updateData.accessibility_info = null;
      updateData.latitude = null;
      updateData.longitude = null;
      updateData.google_maps_url = null;
    }

    await event.update(updateData);

    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 6. UPDATE MEDIA
// ======================================================
export const updateMedia = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.files?.bannerImage) {
      event.banner_image = req.files.bannerImage[0].location;
    }

    if (req.files?.galleryImages) {
      const imgs = req.files.galleryImages.map(f => f.location);
      event.gallery_images = [...event.gallery_images, ...imgs];
    }

    await event.save();
    await deleteCache(`event:${event.id}`);

    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 7. UPDATE PRICING
// ======================================================
export const updatePricing = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.update({ price: req.body.price });
    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 8. SUBMIT EVENT
// ======================================================
export const submitEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "pending";
    await event.save();

    await deleteCache("pending_events");

    return res.json({ success: true, message: "Event submitted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 9. ADMIN: GET PENDING EVENTS
// ======================================================
export const getPendingItems = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: "pending" },
      include: [{
        model: Host,
        include: [{ model: User, attributes: ["id", "email"] }]
      }],
      order: [["created_at", "DESC"]]
    });

    return res.json({ success: true, events });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 10. APPROVE / REJECT EVENT
// ======================================================
export const approveEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  event.status = "approved";
  event.rejection_reason = "";
  await event.save();

  await deleteCache("approved_events");
  await deleteCache(`event:${event.id}`);

  res.json({ success: true });
};

export const rejectEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  event.status = "rejected";
  event.rejection_reason = req.body.reason || "";
  await event.save();

  await deleteCache(`event:${event.id}`);
  res.json({ success: true });
};

// ======================================================
// 11. GET APPROVED EVENTS
// ======================================================
export const getApprovedEvents = async (req, res) => {
  const events = await Event.findAll({
    where: { status: "approved" },
    include: [{ model: Host }],
    order: [["created_at", "DESC"]]
  });

  res.json({ success: true, events });
};

// ======================================================
// 12. GET MY EVENTS
// ======================================================
export const getMyEvents = async (req, res) => {
  const host = await Host.findOne({ where: { user_id: req.user.id } });
  if (!host) return res.json({ success: true, events: [] });

  const events = await Event.findAll({ where: { host_id: host.id } });
  res.json({ success: true, events });
};

// ======================================================
// 13. JOIN / LEAVE EVENT (FIXED NOTIFICATIONS)
// ======================================================
export const joinEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  const exists = await EventParticipant.findOne({
    where: { event_id: event.id, user_id: req.user.id }
  });

  if (exists) return res.status(400).json({ message: "Already joined" });

  await EventParticipant.create({
    event_id: event.id,
    user_id: req.user.id
  });

  await event.increment("attendees_count");

  const host = await Host.findByPk(event.host_id);

  await createNotification({
    userId: host.user_id,
    title: "Event Update",
    message: "Someone joined your event",
    type: "event"
  });

  res.json({ success: true });
};

export const leaveEvent = async (req, res) => {
  const participant = await EventParticipant.findOne({
    where: { event_id: req.params.id, user_id: req.user.id }
  });

  if (!participant) {
    return res.status(400).json({ message: "Not joined" });
  }

  await participant.destroy();

  const event = await Event.findByPk(req.params.id);
  await event.decrement("attendees_count");

  res.json({ success: true });
};
