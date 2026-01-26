import express from 'express';
import emailQueue from '../services/queues/emailQueue.js'; // Adjust path if necessary

const router = express.Router();

router.post('/send-test-email', async (req, res) => {
  try {
    console.log("🧪 Adding test email job to queue...");

    // Add a job to the BullMQ queue
    const job = await emailQueue.add({
      to: "your-email@example.com", // ⚠️ CHANGE THIS to your real email
      type: "HOST_APPROVED", // Ensure this type exists in emailService.js
      data: {
        title: "Test Email from Server",
        message: "This is a test to verify the worker is running.",
        metadata: { test: true }
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