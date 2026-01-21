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
  getAdminApprovedEvents,
  getAdminRejectedEvents,
  getApprovedEvents,
  getMyEvents,
  getCommunityById,
  joinEvent,
  leaveEvent,
  softDeleteEvent
} from "../controllers/Event.controllers.js";
import { verifyEventOwnership } from "../middleware/verifyEventOwnership.js";
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'
import { loadEvent } from "../middleware/loadEvent.js";
import { uploadEventImages } from "../middleware/uploads/event.upload.js";

const router = express.Router();

/* -----------------------------------------
   HOST FLOW: Create + Edit Event
----------------------------------------- */

// Create draft
router.post("/create-draft", userauth, createEventDraft);

// Update basic info
router.put("/basic-info/:id", userauth,loadEvent,verifyEventOwnership, updateBasicInfo);

// Update location
router.put("/location/:id", userauth,loadEvent,verifyEventOwnership, updateLocation);

// Update venue + what's included
router.put("/venue/:id", userauth,loadEvent,verifyEventOwnership, updateVenue);

// Update schedule (JSON array)
router.put("/schedule/:id", userauth,loadEvent,verifyEventOwnership, updateSchedule);

// Upload banner + gallery
router.put("/media/:id",userauth,loadEvent,verifyEventOwnership,uploadEventImages.fields([{ name: "bannerImage", maxCount: 1 },{ name: "galleryImages", maxCount: 10 }]),multerErrorHandler,updateMedia);

// Update pricing
router.put("/pricing/:id", userauth,loadEvent,verifyEventOwnership, updatePricing);

// Submit event for admin approval
router.put("/submit/:id", userauth,loadEvent,verifyEventOwnership, submitEvent);

//USER ACTIONS FOR EVENTS

router.post("/:id/join", userauth,loadEvent, joinEvent);
router.post("/:id/leave", userauth,loadEvent, leaveEvent);

// Host’s own events (My Events)
router.get("/host/my-events", userauth, getMyEvents);
// Safe delete event (host only)
router.delete("/delete/:id",userauth,loadEvent,verifyEventOwnership,softDeleteEvent);
/* -----------------------------------------
   ADMIN FLOW
----------------------------------------- */

router.get("/admin/pending", adminAuth, getPendingItems);
router.get("/admin/statistics",adminAuth,getAdminDashboardStats)
router.put("/admin/approve/:id", adminAuth, approveEvent);
router.put("/admin/reject/:id", adminAuth, rejectEvent);
// ADMIN VISIBILITY
router.get("/admin/events/approved", adminAuth, getAdminApprovedEvents);
router.get("/admin/events/rejected", adminAuth, getAdminRejectedEvents);

/* -----------------------------------------
   PUBLIC ROUTES
----------------------------------------- */

// Approved events (homepage list)
router.get("/approved", getApprovedEvents);

// Single event
router.get("/:id", getCommunityById);


export default router;
