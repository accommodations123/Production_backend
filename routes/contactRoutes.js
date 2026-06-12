import express from "express";
import { submitContactForm } from "../controllers/contactController.js";
import { contactRateLimit } from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /contact/submit
router.post("/submit", contactRateLimit, submitContactForm);

export default router;