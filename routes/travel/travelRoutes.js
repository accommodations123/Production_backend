import express from "express";
import {
   createTrip,
   searchTrips,
   myTrips,
   publicBrowseTrips,
   publicSearchTrips,
   publicTripPreview,
   adminGetAllTrips,
   adminCancelTrip,
   adminBlockHost,
   adminGetPendingTrips,
   adminApproveTrip,
   adminRejectTrip
} from "../../controllers/travel/TravelController.js";

import userAuth from "../../middleware/userAuth.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
import optionalAuth from "../../middleware/joinleaveAuth.js";
import { creationRateLimit } from "../../middleware/rateLimiter.js";

const router = express.Router();

/* ===============================
   TRIPS
   =============================== */

// Create a trip (approved host only)
router.post("/trips", userAuth, creationRateLimit, createTrip);

// Search trips (authenticated)
router.get("/trips/auth-search", userAuth, searchTrips);

// Get my trips (dashboard)
router.get("/trips/me", userAuth, myTrips);

router.get("/trips", optionalAuth, publicBrowseTrips);
router.get("/trips/search", optionalAuth, publicSearchTrips);
router.get("/trips/:trip_id", optionalAuth, publicTripPreview);


//ADMIN ROUTES
router.get("/admin/trips", adminAuth, requireRole("super_admin", "admin"), adminGetAllTrips);
router.get("/admin/trips/pending", adminAuth, requireRole("super_admin", "admin"), adminGetPendingTrips);
router.put("/admin/trips/:trip_id/approve", adminAuth, requireRole("super_admin", "admin"), adminApproveTrip);
router.put("/admin/trips/:trip_id/reject", adminAuth, requireRole("super_admin", "admin"), adminRejectTrip);
router.put("/admin/trips/:trip_id/cancel", adminAuth, requireRole("super_admin", "admin"), adminCancelTrip);

//Hosts
router.put("/admin/hosts/:host_id/block", adminAuth, requireRole("super_admin", "admin"), adminBlockHost);

export default router;
