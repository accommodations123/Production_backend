// src/workers/emailWorker.js
import { Worker } from "bullmq";
import { sendNotificationEmail } from "../../services/emailService.js";

new Worker(
  "email-queue",
  async (job) => {
    await sendNotificationEmail(job.data);
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379
    }
  }
);
