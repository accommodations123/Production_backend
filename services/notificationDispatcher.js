// src/services/notificationDispatcher.js
import Notification from "../model/Notification.js";
import { getIO } from "../services/socket.js";
import emailQueue from "../services/queues/emailQueue.js";

export const notifyAndEmail = async ({
  userId,
  email,
  type,
  title,
  message,
  metadata = {}
}) => {
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    metadata
  });

  // Inline socket
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification:new", {
      id: notification.id,
      type,
      title,
      message,
      metadata,
      created_at: notification.createdAt
    });
  } catch {}

  // Email async
  if (email) {
    await emailQueue.add("send-notification-email", {
      to: email,
      type,
      data: metadata
    });
  }

  return notification;
};
