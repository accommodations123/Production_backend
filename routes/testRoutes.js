import express from "express";
import { createJob } from "../services/queues/emailQueue.js";

const router = express.Router();

router.post("/send-test-email", async (req, res) => {
  try {
    console.log("🧪 Adding test email job to queue...");

    const job = await createJob("HOST_APPROVED", {
      type: "HOST_APPROVED",
      to: "bhargavreddy.mettu333@gmail.com",
      data: {
        test: true
      }
    });

    return res.status(200).json({
      success: true,
      message: "Job added to queue successfully",
      jobId: job.id
    });
  } catch (error) {
    console.error("❌ Queue Add Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add job",
      error: error.message
    });
  }
});

export default router;
