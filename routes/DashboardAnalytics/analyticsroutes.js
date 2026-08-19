import express from "express";
import {
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getAnalyticsByLocation
} from "../../controllers/DashboardAnalytics/adminAnalyticsController.js";

import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";

const router = express.Router();

router.get("/summary", adminAuth, requireRole("super_admin", "admin"), getAnalyticsSummary);
router.get("/timeseries", adminAuth, requireRole("super_admin", "admin"), getAnalyticsTimeseries);
router.get("/by-location", adminAuth, requireRole("super_admin", "admin"), getAnalyticsByLocation);

export default router;
