// src/services/eventService.js
import Event from "../model/Events.models.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { notifyAndEmail } from "./notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../constants/notificationTypes.js";

export const approveEvent = async ({ event }) => {
  // DynamoDB: use Model.update instead of instance.save()
  await Event.update({ id: event.id }, {
    status: "approved",
    rejection_reason: ""
  });

  // Manually fetch Host + User for notification (replaces Sequelize include)
  const host = await Host.get(event.host_id);
  if (host) {
    const user = await User.get(host.user_id);
    if (user?.email) {
      await notifyAndEmail({
        userId: host.user_id,
        email: user.email,
        type: NOTIFICATION_TYPES.EVENT_APPROVED,
        title: "Event approved",
        message: "Your event has been approved.",
        metadata: { title: event.title, eventId: event.id }
      });
    }
  }
};
