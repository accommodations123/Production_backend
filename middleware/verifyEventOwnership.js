import Event from "../model/Events.models.js";
import Host from "../model/Host.js";

export const verifyEventOwnership = async (req, res, next) => {
  try {
    // 1️⃣ Ensure auth context exists
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const eventId = Number(req.params.id);
    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    // 2️⃣ Fetch event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // 3️⃣ Fetch host
    const host = await Host.findByPk(event.host_id);
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    // 4️⃣ Ownership check
    if (host.user_id !== req.user.id) {
      return res.status(403).json({ message: "You do not own this event" });
    }

    // 5️⃣ Attach for downstream controllers
    req.event = event;
    req.host = host;

    next();
  } catch (err) {
    console.error("verifyEventOwnership error:", err);
    return res.status(500).json({ message: "Ownership verification failed" });
  }
};
