import User from "../model/User.js";
import Host from "../model/Host.js";
import Event from "../model/Events.models.js";

export const eventWriteGuard = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    // DynamoDB: get by primary key, then manually check conditions
    const event = await Event.get(eventId);

    if (!event || event.is_deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Manually fetch Host to check ownership
    const host = await Host.get(event.host_id);
    if (!host || host.user_id !== userId) {
      return res.status(403).json({ message: "You do not own this event" });
    }

    // Attach Host data to event for downstream use
    event.Host = { id: host.id, user_id: host.user_id };
    req.event = event;
    req.eventHost = event.Host;

    next();
  } catch (err) {
    console.error("EVENT WRITE GUARD ERROR:", err);
    return res.status(500).json({ message: "Access validation failed" });
  }
};

export const eventParticipationGuard = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    // DynamoDB: get by primary key, then check conditions
    const event = await Event.get(eventId);

    if (!event || event.status !== "approved" || event.is_deleted) {
      return res.status(404).json({ message: "Event not available" });
    }

    req.event = event;
    next();
  } catch (err) {
    console.error("EVENT PARTICIPATION GUARD ERROR:", err);
    return res.status(500).json({ message: "Access validation failed" });
  }
};
