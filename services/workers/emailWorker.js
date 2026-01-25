import { Worker } from "bullmq";
import { sendNotificationEmail } from "../../services/emailService.js";

const worker = new Worker(
  "email-queue",
  async (job) => {
    console.log("📧 Processing email job:", job.data);
    await sendNotificationEmail(job.data);
    console.log("✅ Email sent:", job.data.to);
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379
    }
  }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`❌ Job ${job.id} failed:`, err));

console.log("📧 Email worker started");