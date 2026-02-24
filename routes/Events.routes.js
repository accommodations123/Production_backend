import express from "express";
import userauth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";

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
   getEventById,
   joinEvent,
   leaveEvent,
   softDeleteEvent
} from "../controllers/Event.controllers.js";
import { multerErrorHandler } from '../middleware/uploads/multerErrorHandler.js'
import { uploadEventImages } from "../middleware/uploads/event.upload.js";
import optionalAuth from "../middleware/joinleaveAuth.js";
import { eventWriteGuard, eventParticipationGuard } from "../middleware/eventWriteGuard.js";
const router = express.Router();

/* -----------------------------------------
   HOST FLOW: Create + Edit Event
----------------------------------------- */

// Create draft
router.post("/create-draft", userauth, createEventDraft);

// Update basic info
router.put("/basic-info/:id", userauth, eventWriteGuard, updateBasicInfo);

// Update location
router.put("/location/:id", userauth, eventWriteGuard, updateLocation);

// Update venue + what's included
router.put("/venue/:id", userauth, eventWriteGuard, updateVenue);

// Update schedule (JSON array)
router.put("/schedule/:id", userauth, eventWriteGuard, updateSchedule);

// Upload banner + gallery
router.put("/media/:id", userauth, eventWriteGuard, uploadEventImages.fields([{ name: "bannerImage", maxCount: 1 }, { name: "galleryImages", maxCount: 10 }]), multerErrorHandler, updateMedia);

// Update pricing
router.put("/pricing/:id", userauth, eventWriteGuard, updatePricing);

// Submit event for admin approval
router.put("/submit/:id", userauth, eventWriteGuard, submitEvent);

//USER ACTIONS FOR EVENTS

router.post("/:id/join", userauth, eventParticipationGuard, joinEvent);
router.post("/:id/leave", userauth, eventParticipationGuard, leaveEvent);

// Host’s own events (My Events)
router.get("/host/my-events", userauth, getMyEvents);
// Safe delete event (host only)
router.delete("/delete/:id", userauth, eventWriteGuard, softDeleteEvent);
/* -----------------------------------------
   ADMIN FLOW
----------------------------------------- */

router.get("/admin/pending", adminAuth, requireRole("super_admin", "admin"), getPendingItems);
router.get("/admin/statistics", adminAuth, requireRole("super_admin", "admin"), getAdminDashboardStats)
router.put("/admin/approve/:id", adminAuth, requireRole("super_admin", "admin"), approveEvent);
router.put("/admin/reject/:id", adminAuth, requireRole("super_admin", "admin"), rejectEvent);
// ADMIN VISIBILITY
router.get("/admin/events/approved", adminAuth, requireRole("super_admin", "admin"), getAdminApprovedEvents);
router.get("/admin/events/rejected", adminAuth, requireRole("super_admin", "admin"), getAdminRejectedEvents);

/* -----------------------------------------
   PUBLIC ROUTES
----------------------------------------- */

// Approved events (homepage list)
router.get("/approved", getApprovedEvents);

// Single event
router.get("/:id", optionalAuth, getEventById);


export default router;
