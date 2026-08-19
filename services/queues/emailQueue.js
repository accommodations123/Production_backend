import { sendNotificationEmail } from "../emailService.js";
import { getRedisClient, getRedisConnected } from "../cacheService.js";
import { Queue, Worker } from "bullmq";

let queue = null;
let worker = null;

const isRedisConnected = getRedisConnected();
const redisClient = getRedisClient();

if (isRedisConnected && redisClient && process.env.USE_REDIS === "true") {
  try {
    const connection = {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    };

    queue = new Queue("emailQueue", { connection });
    
    worker = new Worker("emailQueue", async (job) => {
      const { data } = job;
      await sendNotificationEmail(data);
      console.log(`✅ [Email Queue] Sent email for job ${job.id} (to=${data.to})`);
    }, { connection, concurrency: 2 });

    worker.on("failed", (job, err) => {
      console.error(`❌ [Email Queue] Job ${job.id} failed:`, err.message);
    });

    console.log("📬 Email queue: BullMQ Redis-backed mode active.");
  } catch (err) {
    console.error("❌ Failed to initialize BullMQ. Falling back to setImmediate.", err.message);
  }
} else {
  console.log("📬 Email queue: fire-and-forget mode (setImmediate, non-blocking).");
}

export const createJob = async (jobType, data, options = {}) => {
  if (queue) {
    try {
      const job = await queue.add(jobType, data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        ...options
      });
      console.log(`📬 [Email Queue] Queued job ${job.id} via Redis (to=${data.to})`);
      return { queued: true, jobId: job.id, type: jobType, to: data.to };
    } catch (err) {
      console.warn("⚠️ Failed to queue via BullMQ, falling back to setImmediate:", err.message);
    }
  }

  // Fallback fire-and-forget
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

    resolve({ queued: true, fallback: true, type: jobType, to: data.to });
  });
};
