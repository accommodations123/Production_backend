import express from "express";
import adminAuth from "../../middleware/adminAuth.js";

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

router.get("/analytics/travel/overview",adminAuth,getTravelOverview);

router.get("/analytics/travel/trend",adminAuth,getTravelDailyTrend);

router.get("/analytics/travel/countries",adminAuth,getTravelByCountry);

router.get("/analytics/travel/match-conversion",adminAuth,getTravelMatchConversion);

export default router;
