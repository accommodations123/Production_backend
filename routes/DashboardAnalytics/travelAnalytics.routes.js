import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";

import {
  getTravelOverview,
  getTravelDailyTrend,
  getTravelByCountry,
  getTravelMatchConversion
} from "../../controllers/DashboardAnalytics/travelAnalytics.controller.js";

const router = express.Router();

/* ======================================================
   TRAVEL ANALYTICS – ADMIN
====================================================== */

router.get("/analytics/travel/overview", adminAuth, requireRole("super_admin", "admin"), getTravelOverview);

router.get("/analytics/travel/trend", adminAuth, requireRole("super_admin", "admin"), getTravelDailyTrend);

router.get("/analytics/travel/countries", adminAuth, requireRole("super_admin", "admin"), getTravelByCountry);

router.get("/analytics/travel/match-conversion", adminAuth, requireRole("super_admin", "admin"), getTravelMatchConversion);

export default router;
