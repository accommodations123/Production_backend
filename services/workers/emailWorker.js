import { Worker } from "bullmq";
import { sendNotificationEmail } from "../../services/emailService.js";

// ✅ FIX: Combine host and port into a single connection string
const redisUrl = `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`;

console.log("🔗 Worker connecting to Redis via:", redisUrl);

const worker = new Worker(
  "email-queue",
  async (job) => {
    console.log("📧 Processing email job:", job.data);
    await sendNotificationEmail(job.data);
    console.log("✅ Email sent:", job.data.to);
  },
  {
    connection: redisUrl,
    // ✅ FIX: Force Standalone Mode
    settings: {
      maxRetriesPerRequest: 0,
      retryStrategy: "reconnect"
    }
  }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));
worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
  // ✅ DEBUG: This will tell us exactly why Lua script failed
  console.error("Details:", err);
});