import express from "express";
import userauth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";

import {
  createEventDraft,
  updateBasicInfo,
  updateLocation,
  updateVenue,
  updateSchedule,
  updateMedia,
  updatePricing,
  submitEvent,
  getPendingItems,
  getAdminDashboardStats,
  approveEvent,
  rejectEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  softDeleteEvent
} from "../controllers/Event.controllers.js";
import { loadEvent } from "../middleware/loadEvent.js";
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'
import { hostOnly } from "../middleware/hostOnly.js";
import { uploadEventImages } from "../middleware/uploads/event.upload.js";

const router = express.Router();

/* -----------------------------------------
   HOST FLOW: Create + Edit Event
----------------------------------------- */

// Create draft
router.post("/create-draft", userauth,hostOnly, createEventDraft);

// Update basic info
router.put("/basic-info/:id", userauth,hostOnly,loadEvent, updateBasicInfo);

// Update location
router.put("/location/:id", userauth,hostOnly,loadEvent, updateLocation);

// Update venue + what's included
router.put("/venue/:id", userauth,hostOnly,loadEvent, updateVenue);

// Update schedule (JSON array)
router.put("/schedule/:id", userauth,hostOnly,loadEvent, updateSchedule);

// Upload banner + gallery
router.put("/media/:id",userauth,hostOnly,loadEvent,uploadEventImages.fields([{ name: "bannerImage", maxCount: 1 },{ name: "galleryImages", maxCount: 10 }]),multerErrorHandler,updateMedia);

// Update pricing
router.put("/pricing/:id", userauth,hostOnly,loadEvent, updatePricing);

// Submit event for admin approval
router.put("/submit/:id", userauth,hostOnly,loadEvent, submitEvent);

//USER ACTIONS FOR EVENTS

router.post("/:id/join", userauth, joinEvent);
router.post("/:id/leave", userauth, leaveEvent);

// Host’s own events (My Events)
router.get("/host/my-events", userauth,hostOnly, getMyEvents);
// Safe delete event (host only)
router.delete("/delete/:id",userauth,hostOnly,loadEvent,softDeleteEvent);


/* -----------------------------------------
   ADMIN FLOW
----------------------------------------- */

router.get("/admin/pending", adminAuth, getPendingItems);
router.get("/admin/statistics",adminAuth,getAdminDashboardStats)
router.put("/admin/approve/:id", adminAuth, approveEvent);
router.put("/admin/reject/:id", adminAuth, rejectEvent);
/* -----------------------------------------
   PUBLIC ROUTES
----------------------------------------- */

// Approved events (homepage list)
router.get("/approved", getApprovedEvents);

// Single event
router.get("/:id", getEventById);


export default router;
