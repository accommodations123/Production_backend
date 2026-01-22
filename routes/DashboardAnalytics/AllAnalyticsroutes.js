import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import {
  analyticsOverview,
  analyticsDaily,
  analyticsTopEvents,
  analyticsByLocation
} from "../../controllers/DashboardAnalytics/AnalyticsController.js";

const router = express.Router();

router.use(adminAuth);

router.get("/overview",adminAuth, analyticsOverview);
router.get("/daily",adminAuth, analyticsDaily);
router.get("/top-events",adminAuth, analyticsTopEvents);
router.get("/by-location",adminAuth, analyticsByLocation);

export default router;
