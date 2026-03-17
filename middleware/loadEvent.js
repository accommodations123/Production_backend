import Event from "../model/Events.models.js";

export const loadEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const event = await Event.get(eventId,
        is_deleted: false
      );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    req.event = event;
    next();
  } catch (err) {
    console.error("LOAD EVENT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
