// src/services/notificationDispatcher.js
import Notification from "../model/Notification.js";
import { getIO } from "./socket.js";
import { createJob } from "../services/queues/emailQueue.js";

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

  // 3️⃣ Email (async, non-blocking, QUEUED CORRECTLY)
  if (email) {
    createJob(type, {
      type,            // 👈 explicit
      to: email,
      data: metadata   // 👈 matches emailService contract
    }).catch(err => {
      console.error("❌ QUEUE_ERROR:", err.message);
    });
  }

  return notification;
};
