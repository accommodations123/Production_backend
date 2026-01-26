import { Queue } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379
};

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection
});

/**
 * Add email job to queue
 * BullMQ handles serialization internally — DO NOT stringify
 */
export const createJob = async (jobType, data, options = {}) => {
  return emailQueue.add(jobType, data, options);
};

console.log(
  `🔌 Email Queue connected to Redis at ${redisConnection.host}:${redisConnection.port}`
);
