import express from "express";
import { submitContactForm } from "../controllers/contactController.js";
import { rateLimit } from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /contact/submit
router.post("/submit", rateLimit, submitContactForm);

export default router;