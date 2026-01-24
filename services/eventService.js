// src/services/eventService.js
import { notifyAndEmail } from "./notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";

export const approveEvent = async ({ event }) => {
  event.status = "approved";
  event.rejection_reason = "";
  await event.save();

  await notifyAndEmail({
    userId: event.Host.user_id,
    email: event.Host.User.email,
    type: NOTIFICATION_TYPES.EVENT_APPROVED,
    title: "Event approved",
    message: "Your event has been approved.",
    metadata: { title: event.title, eventId: event.id }
  });
};
