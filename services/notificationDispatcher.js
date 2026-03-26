// src/services/notificationDispatcher.js
import Notification from "../model/Notification.js";
import { getIO } from "./socket.js";
import { createJob } from "../services/queues/emailQueue.js";
import { sendNotificationEmail } from "./emailService.js";

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

  // 3️⃣ Email — try queue first, fall back to direct send
  if (email) {
    console.log(`📡 Sending email to: ${email} (Type: ${type})`);
    try {
      await createJob(type, {
        type,
        to: email,
        data: metadata
      });
      console.log(`✅ Email job queued for: ${email}`);
    } catch (queueErr) {
      console.warn("⚠️ Queue unavailable, sending email directly:", queueErr.message);
      try {
        await sendNotificationEmail({ to: email, type, data: metadata });
        console.log(`✅ Email sent directly to: ${email}`);
      } catch (emailErr) {
        console.error("❌ DIRECT_EMAIL_FAILED:", emailErr.message);
      }
    }
  } else {
    console.warn("⚠️ No email provided, skipping email.");
  }

  return notification;
};
