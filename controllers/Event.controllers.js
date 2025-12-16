import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import sequelize from "../config/db.js";

import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// ======================================================
// 1. CREATE EVENT DRAFT
// ======================================================
export const createEventDraft = async (req, res) => {
  try {
    const userId = req.user.id;

    const host = await Host.findOne({ where: { user_id: userId } });
    if (!host) {
      return res.status(400).json({
        success: false,
        message: "You must complete host verification before creating events."
      });
    }

    const { title, type, start_date, start_time } = req.body;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (title, start_date, start_time)."
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

    // Invalidate pending items cache
    await deleteCache("pending_events");

    return res.json({
      success: true,
      eventId: event.id,
      message: "Event draft created successfully."
    });

  } catch (err) {
    console.log("Create Event Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ======================================================
// 2. UPDATE BASIC INFO
// ======================================================
export const updateBasicInfo = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

     const {
      title,
      description,
      type,
      event_mode,
      event_url,
      online_instructions
    } = req.body;

    await event.update({
      title,
      description,
      type,
      event_mode,
      event_url,
      online_instructions
    });
    // Invalidate caches
    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 3. UPDATE LOCATION
// ======================================================
export const updateLocation = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await event.update({
      country: req.body.country,
      city: req.body.city,
      address: req.body.address,
      landmark: req.body.landmark
    });

    // Clear caches
    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 4. UPDATE SCHEDULE
// ======================================================
export const updateSchedule = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await event.update({
      schedule: req.body.schedule || []
    });

    await deleteCache(`event:${event.id}`);

    return res.json({ success: true, event });

  } catch (err) {
    console.log("Schedule update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// UPDATE VENUE + WHAT'S INCLUDED
// ======================================================
export const updateVenue = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    await event.update({
      venue_name: req.body.venue_name,
      venue_description: req.body.venue_description,
      parking_info: req.body.parking_info,
      accessibility_info: req.body.accessibility_info,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      google_maps_url: req.body.google_maps_url,
      included_items: req.body.included_items
    });

    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({
      success: true,
      message: "Venue and included items updated",
      event
    });

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
    const id = req.params.id;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.files?.bannerImage) {
      event.banner_image = req.files.bannerImage[0].location;
    }

    if (req.files?.galleryImages) {
      const newGalleryImages = req.files.galleryImages.map(f => f.location);
      event.gallery_images = [...event.gallery_images, ...newGalleryImages];
    }

    await event.save();

    await deleteCache(`event:${event.id}`);

    return res.json({ success: true, event });

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
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await event.update({
      price: req.body.price
    });

    await deleteCache(`event:${event.id}`);
    await deleteCache("approved_events");

    return res.json({ success: true, event });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 7. SUBMIT EVENT FOR ADMIN APPROVAL
// ======================================================
export const submitEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "pending";
    await event.save();

    await deleteCache("pending_events");

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
    const cached = await getCache("pending_events");
    if (cached) {
      return res.json({ success: true, events: cached.events, hosts: cached.hosts });
    }

    const pendingEvents = await Event.findAll({
      where: { status: "pending" },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    const pendingHosts = await Host.findAll({
      where: { status: "pending" },
      order: [["created_at", "DESC"]],
      include: [
        { model: User, attributes: ["id", "email"] }
      ]
    });

    const result = { events: pendingEvents, hosts: pendingHosts };

    await setCache("pending_events", result, 300);

    return res.json({ success: true, ...result });

  } catch (error) {
    console.log("PENDING ITEMS ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================================================
// APPROVE EVENT
// ======================================================
export const approveEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "approved";
    event.rejection_reason = "";
    await event.save();

    await deleteCache("pending_events");
    await deleteCache("approved_events");
    await deleteCache(`event:${event.id}`);

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
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "rejected";
    event.rejection_reason = req.body.reason || "";
    await event.save();

    await deleteCache("pending_events");
    await deleteCache(`event:${event.id}`);

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
    const cached = await getCache("approved_events");
    if (cached) return res.json({ success: true, events: cached });

    const events = await Event.findAll({
      where: { status: "approved" },
      include: [{ model: Host, attributes: ["id", "full_name","selfie_photo","phone","email","status"] }]
    });

    await setCache("approved_events", events, 300);

    return res.json({ success: true, events });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// HOST: GET MY EVENTS
// ======================================================
export const getMyEvents = async (req, res) => {
  try {
    const host = await Host.findOne({ where: { user_id: req.user.id } });

    if (!host) {
      return res.status(400).json({ success: false, message: "You are not a host." });
    }

    const cached = await getCache(`host_events:${host.id}`);
    if (cached) return res.json({ success: true, events: cached });

    const events = await Event.findAll({
      where: { host_id: host.id }
    });

    await setCache(`host_events:${host.id}`, events, 300);

    return res.json({ success: true, events });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// GET SINGLE EVENT DETAILS
// ======================================================
export const getEventById = async (req, res) => {
  try {
    const cached = await getCache(`event:${req.params.id}`);
    if (cached) {
      return res.json({ success: true, event: cached });
    }

    const event = await Event.findByPk(req.params.id, {
      include: [{ model: Host, attributes: ["id", "full_name","selfie_photo","phone","email","status"] }]
    });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    await setCache(`event:${req.params.id}`, event, 300);

    return res.json({ success: true, event });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================================================
// JOIN EVENT
// ======================================================

export const joinEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.increment("attendees_count");

    return res.json({
      success: true,
      message: "Joined event",
      attendees_count: event.attendees_count + 1
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


// ======================================================
// LEAVE EVENT
// ======================================================
export const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.attendees_count > 0) {
      await event.decrement("attendees_count");
    }

    return res.json({
      success: true,
      message: "Left event",
      attendees_count: Math.max(event.attendees_count - 1, 0)
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

