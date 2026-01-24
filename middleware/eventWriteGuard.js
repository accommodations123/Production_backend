import User from "../model/User.js";
import Host from "../model/Host.js";
import Event from "../model/Events.models.js";

export const eventWriteGuard = async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const userId = Number(req.user.id);

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
        is_deleted: false
      },
      include: [{
        model: Host,
        attributes: ["id", "user_id"]
      }]
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.Host.user_id !== userId) {
      return res.status(403).json({ message: "You do not own this event" });
    }

    if (["approved", "rejected"].includes(event.status)) {
      return res.status(400).json({
        message: `Event cannot be modified when status is '${event.status}'`
      });
    }

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
    const eventId = Number(req.params.id);

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
        status: "approved",
        is_deleted: false
      },
      attributes: ["id", "host_id"]
    });

    if (!event) {
      return res.status(404).json({ message: "Event not available" });
    }

    req.event = event;
    next();
  } catch (err) {
    console.error("EVENT PARTICIPATION GUARD ERROR:", err);
    return res.status(500).json({ message: "Access validation failed" });
  }
};
