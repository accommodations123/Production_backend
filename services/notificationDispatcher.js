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
  // 1️⃣ Persist notification
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    metadata
  });

  // 2️⃣ Real-time socket push
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", {
      id: notification.id,
      type,
      title,
      message,
      metadata,
      created_at: notification.createdAt
    });
  } catch (err) {
    console.error("SOCKET EMIT FAILED:", err.message);
  }

  // 3️⃣ Email (async, non-blocking)
  if (email) {
    await emailQueue.add("send-notification-email", {
      to: email,
      type,
      data: metadata
    });
  }

  return notification;
};
