import express from "express";
import {
  createTrip,
  searchTrips,
  myTrips,
  travelMatchAction,
  publicSearchTrips ,
  publicTripPreview ,
  adminGetAllTrips,
  adminCancelTrip,
  adminGetAllMatches,
  adminCancelMatch,
  adminBlockHost
} from "../../controllers/travel/TravelController.js";

import userAuth from "../../middleware/userAuth.js";
import adminAuth from "../../middleware/adminAuth.js";

const router = express.Router();

/* ===============================
   TRIPS
   =============================== */

// Create a trip (approved host only)
router.post("/trips",userAuth,createTrip);

// Search trips (public, but authenticated is better)
router.get("/trips/search",userAuth,searchTrips);

// Get my trips (dashboard)
router.get("/trips/me",userAuth,myTrips);

/* ===============================
   MATCHES (REQUEST / ACCEPT / REJECT / CANCEL)
   =============================== */

// Unified match action controller
router.post("/matches/action",userAuth,travelMatchAction);
router.get("/public/trips",publicSearchTrips )
router.get("/punlic/trips/:id",publicTripPreview )


//ADMIN ROUTES
router.get("/admin/trips",adminAuth,adminGetAllTrips)
router.put("/admin/trips/:trip_id/cancel",adminAuth,adminCancelTrip)

router.get("/matches",adminAuth,adminGetAllMatches)
router.put("/admin/matches/:match_id/cancel",adminAuth,adminCancelMatch)

//Hosts
router.put("/admin/hosts/:host_id/block",adminAuth,adminBlockHost)

export default router;
