// src/routes/testRoutes.js
import express from 'express';
import { createJob } from '../services/queues/emailQueue.js'; // ✅ Import helper

const router = express.Router();

router.post('/send-test-email', async (req, res) => {
    try {
        console.log("🧪 Adding test email job to queue...")

        // ✅ USE SANITIZER INSTEAD OF DIRECT ADD
        const job = await createJob("HOST_APPROVED", {
            type: "HOST_APPROVED",
            to: "bhargavreddy.mettu333@gmail.com",
            data: {
                title: "Test Email from Server",
                message: "This is a test to verify the worker is running.",
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