import { Worker } from "bullmq";
import { sendNotificationEmail } from "../../services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {})
};

const worker = new Worker(
  "email-queue",
  async (job) => {
    console.log("📧 Processing email job:", job.data);

    // ✅ job.data MUST be an object
    await sendNotificationEmail(job.data);

    console.log("✅ Email sent to:", job.data.to);
  },
  { connection }
);

worker.on("completed", (job) =>
  console.log(`✅ Job ${job.id} completed`)
);

worker.on("failed", (job, err) =>
  console.error(`❌ Job ${job.id} failed:`, err)
);

console.log(`📧 Email worker started on ${connection.host}`);

export default worker;
