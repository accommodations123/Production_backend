import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import sequelize from "../config/db.js";
import EventParticipant from "../model/EventParticipant.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
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

    const { title, type, start_date, start_time, end_date, end_time } = req.body;

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
      end_date: end_date ? end_date : null,
      end_time: end_time ? end_time : null,
      status: "draft"
    });

    await AnalyticsEvent.create({
      event_type: "EVENT_DRAFT_CREATED",
      user_id: userId,
      host_id: host.id,
      event_id: event.id,
      country: host.country,
      state: host.state
    });

    // Invalidate pending items cache
    await deleteCacheByPrefix("pending_events:");

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
    const event = req.event;


    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    await event.update({
      title: req.body.title,
      description: req.body.description,
      type: req.body.type
    });
    await AnalyticsEvent.create({
      event_type: "EVENT_BASIC_INFO_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state,
      metadata: {
        step: "basic_info" // change per controller
      }
    });


    // Invalidate caches
    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");

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
    const event = req.event;


    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await event.update({
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      zip_code: req.body.zip_code || null,
      street_address: req.body.street_address,
      landmark: req.body.landmark
    });
    await AnalyticsEvent.create({
      event_type: "EVENT_LOCATION_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


    // Clear caches
    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");

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
    const event = req.event;
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const endDate =
      req.body.end_date !== undefined && req.body.end_date !== ""
        ? req.body.end_date
        : event.end_date;

    const endTime =
      req.body.end_time !== undefined && req.body.end_time !== ""
        ? req.body.end_time
        : event.end_time;

    // ❗ Date validation
    if (endDate && new Date(endDate) < new Date(event.start_date)) {
      return res.status(400).json({
        message: "End date cannot be before start date"
      });
    }

    // ❗ Time validation (same-day only)
    if (
      endDate &&
      event.start_date === endDate &&
      endTime &&
      event.start_time >= endTime
    ) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }

    await event.update({
      schedule: req.body.schedule || event.schedule,
      end_date: endDate,
      end_time: endTime
    });

    await AnalyticsEvent.create({
      event_type: "EVENT_SCHEDULE_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });

    await deleteCache(`event:${event.id}`);

    return res.json({ success: true, event });

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


    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

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

    // Handle online / hybrid logic
    if (event_mode === "online" || event_mode === "hybrid") {
      updateData.event_url = event_url;
      updateData.online_instructions = online_instructions;
    } else {
      updateData.event_url = null;
      updateData.online_instructions = null;
    }

    // Handle offline logic
    if (event_mode === "online") {
      updateData.venue_name = null;
      updateData.venue_description = null;
      updateData.parking_info = null;
      updateData.accessibility_info = null;
      updateData.latitude = null;
      updateData.longitude = null;
      updateData.google_maps_url = null;
    }
    await AnalyticsEvent.create({
      event_type: "EVENT_VENUE_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


    await event.update(updateData);

    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");

    return res.json({
      success: true,
      message: "Venue and event mode updated successfully",
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
    const event = req.event;


    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.files?.bannerImage) {
      event.banner_image = req.files.bannerImage[0].location;
    }

    if (req.files?.galleryImages) {
      const newGalleryImages = req.files.galleryImages.map(f => f.location);
      event.gallery_images = [...event.gallery_images, ...newGalleryImages];
    }

    await event.save();
    await AnalyticsEvent.create({
      event_type: "EVENT_MEDIA_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


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
    const event = req.event;


    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    await event.update({
      price: req.body.price
    });
    await AnalyticsEvent.create({
      event_type: "EVENT_PRICING_UPDATED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");

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
    const event = req.event;


    if (!event) return res.status(404).json({ message: "Event not found" });
    // VALIDATE FIRST
    if (
      event.end_date &&
      new Date(event.end_date) < new Date(event.start_date)
    ) {
      return res.status(400).json({
        message: "End date cannot be before start date"
      });
    }

    if (
      event.end_date &&
      event.start_date === event.end_date &&
      event.end_time &&
      event.start_time >= event.end_time
    ) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }
    event.status = "pending";
    await event.save();
    await AnalyticsEvent.create({
      event_type: "EVENT_SUBMITTED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
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
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    const eventWhere = { status: "pending" };
    if (country) eventWhere.country = country;
    if (state) eventWhere.state = state;

    const hostWhere = { status: "pending" };
    if (country) hostWhere.country = country;
    if (state) hostWhere.state = state;

    const pendingEvents = await Event.findAll({
      where: eventWhere,
      order: [["created_at", "DESC"]],
      include: [{
        model: Host,
        attributes: ["id", "full_name", "status"],
        include: [{ model: User, attributes: ["id", "email", "profile_image"] }]
      }]
    });

    const pendingHosts = await Host.findAll({
      where: hostWhere,
      order: [["created_at", "DESC"]],
      include: [{ model: User, attributes: ["id", "email", "profile_image"] }]
    });

    const result = { events: pendingEvents, hosts: pendingHosts };

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

    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      deletedEvents,
      totalHosts,
      pendingHosts,
      totalUsers
    ] = await Promise.all([
      Event.count(),
      Event.count({ where: { status: "approved", is_deleted: false } }),
      Event.count({ where: { status: "pending", is_deleted: false } }),
      Event.count({ where: { status: "rejected", is_deleted: false } }),
      Event.count({ where: { is_deleted: true } }),
      Host.count(),
      Host.count({ where: { status: "pending" } }),
      User.count()
    ]);

    const stats = {
      events: {
        total: totalEvents,
        approved: approvedEvents,
        pending: pendingEvents,
        rejected: rejectedEvents,
        deleted: deletedEvents
      },
      hosts: {
        total: totalHosts,
        pending: pendingHosts
      },
      users: {
        total: totalUsers
      }
    };

    await setCache(cacheKey, stats, 300);

    return res.json({
      success: true,
      stats
    });

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
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: Host,
          include: [
            {
              model: User,
              attributes: ["email"] // only what exists
            }
          ]
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    // ✅ IDMPOTENCY CHECK FIRST
    if (event.status === "approved") {
      return res.status(400).json({ message: "Event already approved" });
    }

    event.status = "approved";
    event.rejection_reason = "";
    await event.save();
    AnalyticsEvent.create({
      event_type: "EVENT_APPROVED",
      user_id: req.admin.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state,
      metadata: { actor: "admin" }
    });



    await deleteCacheByPrefix(`host_events:${event.host_id}`);
    await deleteCacheByPrefix("pending_events");
    await deleteCacheByPrefix("approved_events");
    await deleteCache(`event:${event.id}`);

    // ✅ ONE LINE — persistent + socket + email
    await notifyAndEmail({
      userId: event.Host.user_id,           // IMPORTANT: user_id, not host_id
      email: event.Host.User.email,
      type: NOTIFICATION_TYPES.EVENT_APPROVED,
      title: "Event approved",
      message: "Your event has been approved and is now live.",
      metadata: {
        eventId: event.id,
        title: event.title
      }
    });


    return res.json({
      success: true,
      message: "Event approved"
    });

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
    const event = await Event.findByPk(req.params.id, {
      include: [{
        model: Host,
        include: [{ model: User, attributes: ["email"] }]
      }]
    });


    if (!event) return res.status(404).json({ message: "Event not found" });
    // ✅ IDMPOTENCY CHECK FIRST
    if (event.status === "rejected") {
      return res.status(400).json({ message: "Event already rejected" });
    }

    event.status = "rejected";
    event.rejection_reason = req.body.reason || "";
    await event.save();
    AnalyticsEvent.create({
      event_type: "EVENT_REJECTED",
      user_id: req.admin?.id || null,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state,
      metadata: { reason: event.rejection_reason }
    });


    await deleteCacheByPrefix(`host_events:${event.host_id}`);
    await deleteCacheByPrefix("pending_events:");
    await deleteCache(`event:${event.id}`);
    // ✅ notify host
    await notifyAndEmail({
      userId: event.Host.user_id,
      email: event.Host.User.email,
      type: NOTIFICATION_TYPES.EVENT_REJECTED,
      title: "Event rejected",
      message: "Your event was rejected. Please review the reason.",
      metadata: {
        eventId: event.id,
        title: event.title,
        reason
      }
    });

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
    const country =
      req.headers["x-country"] || req.query.country || null;
    const state =
      req.headers["x-state"] || req.query.state || null;
    const city =
      req.headers["x-city"] || req.query.city || null;
    const zip_code =
      req.headers["x-zip-code"] || req.query.zip_code || null;

    const where = { status: "approved" };

    if (country) where.country = country;
    if (state) where.state = state;              // ✅ ADD
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    const cacheKey =
      `approved_events:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached });
    }

    const events = await Event.findAll({
      where,
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "phone", "email", "status",],
          include: [
            {
              model: User,
              attributes: ["profile_image"]
            }
          ]
        }
      ],
      order: [["created_at", "DESC"]]
    });

    await setCache(cacheKey, events, 300);

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
    const host = await Host.findOne({
      where: { user_id: req.user.id }
    });

    if (!host) {
      return res.status(400).json({
        success: false,
        message: "You are not a host."
      });
    }

    const cacheKey = `host_events:${host.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached });
    }

    const events = await Event.findAll({
      where: {
        host_id: host.id,
        is_deleted: false
      },
      order: [["created_at", "DESC"]]
    });

    const plainEvents = events.map(e => e.toJSON());

    await setCache(cacheKey, plainEvents, 300);

    return res.json({
      success: true,
      events: plainEvents
    });

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
    const eventId = Number(req.params.id);

    // 🔒 Hard validation
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const cacheKey = `event:${eventId}`;
    let eventData;

    /* ======================================================
       1️⃣ CACHE → DB FALLBACK
       ====================================================== */
    const cached = await getCache(cacheKey);
    if (cached) {
      // 🚨 NEVER mutate cached objects
      eventData = JSON.parse(JSON.stringify(cached));
    } else {
      const event = await Event.findOne({
        where: {
          id: eventId,
          status: "approved",
          is_deleted: false
        },
        include: [
          {
            model: Host,
            attributes: ["id", "full_name", "country", "state", "city"],
            include: [
              {
                model: User,
                attributes: ["profile_image"]
              }
            ]
          }
        ]
      });

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      eventData = event.toJSON();

      // Cache ONLY event data (never user flags)
      await setCache(cacheKey, eventData, 300);

      // 📊 Analytics (fire-and-forget)
      AnalyticsEvent.create({
        event_type: "EVENT_VIEWED",
        user_id: req.user?.id || null,
        event_id: event.id,
        country: req.headers["x-country"] || event.country,
        state: req.headers["x-state"] || event.state
      }).catch(console.error);
    }

    /* ======================================================
       2️⃣ USER-SPECIFIC FLAG (NEVER CACHED)
       ====================================================== */
    let isRegistered = false;

    if (req.user?.id) {
      const participant = await EventParticipant.findOne({
        where: {
          event_id: eventId,
          user_id: req.user.id
        },
        attributes: ["id"]
      });

      isRegistered = !!participant;
    }

    /* ======================================================
       3️⃣ RESPONSE
       ====================================================== */
    return res.json({
      success: true,
      event: eventData,
      is_registered: isRegistered
    });

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

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Prevent duplicate join
    const alreadyJoined = await EventParticipant.findOne({
      where: { event_id: eventId, user_id: userId }
    });

    if (alreadyJoined) {
      return res.status(400).json({
        message: "You have already joined this event"
      });
    }

    // Create participant record
    await EventParticipant.create({
      event_id: eventId,
      user_id: userId
    });
    await AnalyticsEvent.create({
      event_type: "EVENT_JOINED",
      user_id: userId,
      event_id: event.id,
      host_id: event.host_id,
      country: event.country,
      state: event.state
    });


    // Increment count
    await event.increment("attendees_count");
    await event.reload()
    const newCount = event.attendees_count;
    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);


    // 🔔 Notify HOST (not joining user)
    const host = await Host.findByPk(event.host_id);
    if (host) {
      const milestones = [1, 10, 25, 50, 100];
      if (milestones.includes(event.attendees_count)) {
        const io = getIO();
        io.to(`user:${host.user_id}`).emit("notification", {
          type: "EVENT_MILESTONE",
          title: "Event update",
          message: `${event.attendees_count} people have joined your event`,
          eventId: event.id,
          attendees_count: event.attendees_count
        });
      }
    }

    return res.json({
      success: true,
      message: "Joined event",
      attendees_count: event.attendees_count
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

    // Check participant
    const participant = await EventParticipant.findOne({
      where: { event_id: eventId, user_id: userId }
    });

    if (!participant) {
      return res.status(400).json({
        message: "You have not joined this event"
      });
    }

    // Remove participant
    await participant.destroy();

    // Get event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    await AnalyticsEvent.create({
      event_type: "EVENT_LEFT",
      user_id: userId,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


    // Decrement count
    await event.decrement("attendees_count");
    await event.reload()
    const newCount = event.attendees_count;
    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);


    // 🔔 Notify only at meaningful LEAVE milestones
    const leaveMilestones = [0, 9, 24, 49];
    const io = getIO()

    if (leaveMilestones.includes(newCount)) {
      try {
        let message = "People left your event";

        if (newCount === 0) {
          message = "Your event now has no attendees";
        } else {
          message = `Attendee count dropped to ${newCount}`;
        }

        const host = await Host.findByPk(event.host_id);

        io.to(`user:${host.user_id}`).emit("notification", {

          type: "EVENT_LEAVE_MILESTONE",
          title: "Event update",
          message,
          eventId: event.id,
          attendees_count: newCount
        })
      } catch (err) {
        console.error("NOTIFICATION ERROR (LEAVE):", err);
      }
    }

    return res.json({
      success: true,
      message: "Left event",
      attendees_count: newCount
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
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (event.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Event already deleted"
      });
    }

    await event.update({ is_deleted: true });
    await AnalyticsEvent.create({
      event_type: "EVENT_DELETED",
      user_id: req.user.id,
      host_id: event.host_id,
      event_id: event.id,
      country: event.country,
      state: event.state
    });


    await deleteCache(`event:${event.id}`);
    await deleteCacheByPrefix("approved_events:");
    await deleteCacheByPrefix("pending_events:");
    await deleteCacheByPrefix(`host_events:${event.host_id}`);

    return res.json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (err) {
    console.error("DELETE EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getAdminApprovedEvents = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `admin:events:approved:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached });
    }

    const where = { status: "approved", is_deleted: false };
    if (country) where.country = country;
    if (state) where.state = state;

    const events = await Event.findAll({
      where,
      order: [["updated_at", "DESC"]],
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status"],
          include: [
            {
              model: User,
              attributes: ["id", "email", "profile_image"]
            }
          ]
        }
      ]
    });

    const plain = events.map(e => e.toJSON());

    await setCache(cacheKey, plain, 300);

    return res.json({
      success: true,
      events: plain
    });

  } catch (err) {
    console.error("ADMIN APPROVED EVENTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getAdminRejectedEvents = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `admin:events:rejected:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached });
    }

    const where = { status: "rejected", is_deleted: false };
    if (country) where.country = country;
    if (state) where.state = state;

    const events = await Event.findAll({
      where,
      order: [["updated_at", "DESC"]],
      attributes: {
        include: ["rejection_reason"]
      },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status"],
          include: [
            {
              model: User,
              attributes: ["id", "email", "profile_image"]
            }
          ]
        }
      ]
    });

    const plain = events.map(e => e.toJSON());

    await setCache(cacheKey, plain, 300);

    return res.json({
      success: true,
      events: plain
    });

  } catch (err) {
    console.error("ADMIN REJECTED EVENTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};