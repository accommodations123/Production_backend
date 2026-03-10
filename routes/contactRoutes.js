import express from "express";
import { scheduleCall, submitContactForm } from "../controllers/contactController.js";

const router = express.Router();

// POST /contact/schedule-call
router.post("/schedule-call", scheduleCall);

// POST /contact/submit
router.post("/submit", submitContactForm);

export default router;