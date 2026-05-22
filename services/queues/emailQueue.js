import dotenv from "dotenv";
import { sendNotificationEmail } from "../emailService.js";

dotenv.config();

export const emailQueue = null;

/**
 * Add email job - directly sends the email now, avoiding Redis queues.
 */
export const createJob = async (jobType, data, options = {}) => {
  console.log(`🔌 [Direct Email] Bypassed Queue: sending email directly to ${data.to}`);
  return sendNotificationEmail(data);
};

console.log("🔌 Email Queue Redis Connection removed — emails will be sent directly.");
