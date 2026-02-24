import express from "express";
import {
   createTrip,
   searchTrips,
   myTrips,
   travelMatchAction,
   getReceivedMatchRequests,
   publicBrowseTrips,
   publicSearchTrips,
   publicTripPreview,
   adminGetAllTrips,
   adminCancelTrip,
   adminGetAllMatches,
   adminCancelMatch,
   adminBlockHost
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

/* ===============================
   MATCHES (REQUEST / ACCEPT / REJECT / CANCEL)
   =============================== */

// Unified match action controller
router.post("/matches/action", userAuth, travelMatchAction);
router.get("/matches/received", userAuth, getReceivedMatchRequests);
router.get("/trips", publicBrowseTrips)
router.get("/trips/search", publicSearchTrips)
router.get("/trips/:trip_id", publicTripPreview)


//ADMIN ROUTES
router.get("/admin/trips", adminAuth, requireRole("super_admin", "admin"), adminGetAllTrips)
router.put("/admin/trips/:trip_id/cancel", adminAuth, requireRole("super_admin", "admin"), adminCancelTrip)

router.get("/matches", adminAuth, requireRole("super_admin", "admin"), adminGetAllMatches)
router.put("/admin/matches/:match_id/cancel", adminAuth, requireRole("super_admin", "admin"), adminCancelMatch)

//Hosts
router.put("/admin/hosts/:host_id/block", adminAuth, requireRole("super_admin", "admin"), adminBlockHost)

export default router;
