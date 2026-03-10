import express from "express";
import { scheduleCall } from "../controllers/contactController.js";

const router = express.Router();

// POST /contact/schedule-call
router.post("/schedule-call", scheduleCall);

export default router;