import express from "express";
import userauth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";

import {
  createEventDraft,
  updateBasicInfo,
  updateLocation,
  updateSchedule,
  updateMedia,
  updatePricing,
  submitEvent,
  getPendingItems,
  approveEvent,
  rejectEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  joinEvent,
  leaveEvent
} from "../controllers/Event.controllers.js";

import { upload } from "../middleware/upload.js";

const router = express.Router();

/* -----------------------------------------
   HOST FLOW: Create + Edit Event
----------------------------------------- */

// Create draft
router.post("/create-draft", userauth, createEventDraft);

// Update basic info
router.put("/basic-info/:id", userauth, updateBasicInfo);

// Update location
router.put("/location/:id", userauth, updateLocation);

// Update schedule (JSON array)
router.put("/schedule/:id", userauth, updateSchedule);

// Upload banner + gallery
router.put("/media/:id",userauth,upload.fields([{ name: "bannerImage", maxCount: 1 },{ name: "galleryImages", maxCount: 10 }]),updateMedia);

// Update pricing
router.put("/pricing/:id", userauth, updatePricing);

// Submit event for admin approval
router.put("/submit/:id", userauth, submitEvent);

/* -----------------------------------------
   ADMIN FLOW
----------------------------------------- */

router.get("/admin/pending", adminAuth, getPendingItems);

router.put("/admin/approve/:id", adminAuth, approveEvent);
router.put("/admin/reject/:id", adminAuth, rejectEvent);

/* -----------------------------------------
   PUBLIC ROUTES
----------------------------------------- */

// Approved events (homepage list)
router.get("/approved", getApprovedEvents);

// Single event
router.get("/:id", getEventById);

   //USER ACTIONS FOR EVENTS

router.post("/:id/join", userauth, joinEvent);
router.post("/:id/leave", userauth, leaveEvent);

// Host’s own events (My Events)
router.get("/host/my-events", userauth, getMyEvents);

export default router;
