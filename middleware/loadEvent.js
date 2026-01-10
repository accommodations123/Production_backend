import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
export const loadEvent = async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const hostId = req.host.id; // 🔥 from hostOnly

    if (!eventId) {
      return res.status(400).json({
        message: "Invalid event id"
      });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
        host_id: hostId,
        is_deleted: false
      }
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or access denied"
      });
    }

    req.event = event;
    next();

  } catch (err) {
    console.error("LOAD EVENT ERROR:", err);
    return res.status(500).json({
      message: "Server error"
    });
  }
};
