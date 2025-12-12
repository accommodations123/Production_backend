import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import sequelize from "../config/db.js";

// ======================================================
// 1. CREATE EVENT DRAFT (Host must exist)
// ======================================================
export const createEventDraft = async (req, res) => {
  try {
    const userId = req.user.id;
   
    // Ensure host exists
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

    await event.update({
      title: req.body.title,
      description: req.body.description,
      type: req.body.type
    });

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

    // Expecting schedule = []
    await event.update({
      schedule: req.body.schedule || []
    });

    return res.json({ success: true, event });

  } catch (err) {
    console.log("Schedule update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// 5. UPDATE BANNER + GALLERY
// ======================================================
export const updateMedia = async (req, res) => {
  try {
    const id = req.params.id;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // banner: req.files.bannerImage
    if (req.files?.bannerImage) {
      event.banner_image = req.files.bannerImage[0].location;
    }

    // gallery: req.files.galleryImages[]
    if (req.files?.galleryImages) {
      const newGalleryImages = req.files.galleryImages.map(f => f.location);
      event.gallery_images = [...event.gallery_images, ...newGalleryImages];
    }

    await event.save();

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

    return res.json({ success: true, message: "Event submitted to admin." });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: APPROVE EVENT
// ======================================================

export const getPendingItems = async (req, res) => {
  try {
    // Pending events
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

    // Pending hosts
    const pendingHosts = await Host.findAll({
      where: { status: "pending" },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "email"]
        }
      ]
    });

    return res.json({
      success: true,
      events: pendingEvents,
      hosts: pendingHosts
    });

  } catch (error) {
    console.log("PENDING ITEMS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "approved";
    event.rejection_reason = "";
    await event.save();

    return res.json({ success: true, message: "Event approved" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// ADMIN: REJECT EVENT
// ======================================================
export const rejectEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    event.status = "rejected";
    event.rejection_reason = req.body.reason || "";
    await event.save();

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
    const events = await Event.findAll({
      where: { status: "approved" },
      include: [{ model: Host, attributes: ["id", "full_name", "status"] }]
    });

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

    const events = await Event.findAll({
      where: { host_id: host.id }
    });

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
    const event = await Event.findByPk(req.params.id, {
      include: [{ model: Host, attributes: ["id", "full_name", "status"] }]
    });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, event });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================================================
// USER: JOIN EVENT
// ======================================================
export const joinEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = req.user.id;
    const members = event.members_going;

    if (!members.includes(userId)) {
      members.push(userId);
      event.members_going = members;
      await event.save();
    }

    return res.json({ success: true, message: "Joined event" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// USER: LEAVE EVENT
// ======================================================
export const leaveEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    const userId = req.user.id;
    event.members_going = event.members_going.filter(id => id !== userId);
    await event.save();

    return res.json({ success: true, message: "Left event" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
