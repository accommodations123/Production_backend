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

const router = express.Router();

/* ===============================
   TRIPS
   =============================== */

// Create a trip (approved host only)
router.post("/trips", userAuth, createTrip);

// Search trips (public, but authenticated is better)
router.get("/trips/search", userAuth, searchTrips);

// Get my trips (dashboard)
router.get("/trips/me", userAuth, myTrips);

router.get("/trips", publicBrowseTrips);
router.get("/trips/search", publicSearchTrips);
router.get("/trips/:trip_id", publicTripPreview);


//ADMIN ROUTES
router.get("/travel/admin/trips", adminAuth, requireRole("super_admin", "admin"), adminGetAllTrips);
router.get("/travel/admin/trips/pending", adminAuth, requireRole("super_admin", "admin"), adminGetPendingTrips);
router.put("/travel/admin/trips/:trip_id/approve", adminAuth, requireRole("super_admin", "admin"), adminApproveTrip);
router.put("/travel/admin/trips/:trip_id/reject", adminAuth, requireRole("super_admin", "admin"), adminRejectTrip);
router.put("/travel/admin/trips/:trip_id/cancel", adminAuth, requireRole("super_admin", "admin"), adminCancelTrip);

//Hosts
router.put("/admin/hosts/:host_id/block", adminAuth, requireRole("super_admin", "admin"), adminBlockHost);

export default router;
