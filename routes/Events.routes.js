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
  approveEvent,
  rejectEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  joinEvent,
  leaveEvent
} from "../controllers/Event.controllers.js";
import { verifyEventOwnership } from "../middleware/verifyEventOwnership.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* -----------------------------------------
   HOST FLOW
----------------------------------------- */

// Create draft
router.post("/create-draft", userauth, createEventDraft);

// Update flows
router.put("/basic-info/:id", userauth, verifyEventOwnership, updateBasicInfo);
router.put("/location/:id", userauth, verifyEventOwnership, updateLocation);
router.put("/venue/:id", userauth, verifyEventOwnership, updateVenue);
router.put("/schedule/:id", userauth, verifyEventOwnership, updateSchedule);
router.put(
  "/media/:id",
  userauth,
  verifyEventOwnership,
  upload.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 10 }
  ]),
  updateMedia
);
router.put("/pricing/:id", userauth, verifyEventOwnership, updatePricing);
router.put("/submit/:id", userauth, verifyEventOwnership, submitEvent);

/* -----------------------------------------
   ADMIN FLOW
----------------------------------------- */

router.get("/admin/pending", adminAuth, getPendingItems);
router.put("/admin/approve/:id", adminAuth, approveEvent);
router.put("/admin/reject/:id", adminAuth, rejectEvent);

/* -----------------------------------------
   STATIC / SPECIFIC ROUTES
----------------------------------------- */

// Approved events
router.get("/approved", getApprovedEvents);

// Host’s own events
router.get("/host/my-events", userauth, getMyEvents);

/* -----------------------------------------
   USER ACTIONS
----------------------------------------- */

router.post("/:id/join", userauth, joinEvent);
router.post("/:id/leave", userauth, leaveEvent);

/* -----------------------------------------
   DYNAMIC ROUTE — MUST BE LAST
----------------------------------------- */

router.get("/:id", getEventById);

export default router;
