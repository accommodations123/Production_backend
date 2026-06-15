import { sendNotificationEmail } from "../emailService.js";

export const emailQueue = null;

/**
 * Fire-and-forget email dispatch.
 *
 * Uses setImmediate() to push the send outside the current request cycle.
 * The caller gets an instant Promise resolution; the email sends in the
 * background on the next event-loop tick without blocking the HTTP response.
 *
 * Errors are logged but never bubble up to the caller — a failed email must
 * never crash or slow down a user-facing request.
 */
export const createJob = (jobType, data, options = {}) => {
  return new Promise((resolve) => {
    setImmediate(() => {
      sendNotificationEmail(data)
        .then(() => {
          console.log(`✅ [Email] Sent (type=${jobType}, to=${data.to})`);
        })
        .catch((err) => {
          console.error(`❌ [Email] Failed (type=${jobType}, to=${data.to}):`, err.message);
        });
    });

    // Resolve immediately so the HTTP response is never delayed by SMTP
    resolve({ queued: true, type: jobType, to: data.to });
  });
};

console.log("📬 Email queue: fire-and-forget mode (setImmediate, non-blocking).");
