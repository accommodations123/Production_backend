import Event from "../model/Events.models.js";
import Host from "../model/Host.js";


export const verifyEventOwnership = async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const userId = Number(req.user.id);

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const host = await Host.findByPk(event.host_id);
    if (!host) {
      return res.status(404).json({ message: "Host not found" });
    }

    if (Number(host.user_id) !== userId) {
      return res.status(403).json({ message: "You do not own this event" });
    }

    req.event = event;
    req.host = host;
    next();

  } catch (err) {
    console.error("VERIFY EVENT OWNERSHIP ERROR:", err);
    return res.status(500).json({
      message: "Ownership verification failed",
      error: err.message
    });
  }
};
