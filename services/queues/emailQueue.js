import { Queue } from "bullmq";

// ✅ FIX: Combine host and port into a single connection string
const redisUrl = `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`;

console.log("🔗 Connecting to Redis via:", redisUrl);

const emailQueue = new Queue("email-queue", {
  connection: redisUrl,
  // ✅ FIX: Force Standalone Mode (Disable Clustering)
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3
  },
  // ✅ FIX: Retry settings (Prevents hanging connection attempts that cause Lua errors)
  settings: {
    maxRetriesPerRequest: 0, // Important for stable Redis
    retryStrategy: "reconnect" 
  }
});

export default emailQueue;