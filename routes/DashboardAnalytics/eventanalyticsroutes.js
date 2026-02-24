import express from "express";
import {
  getEventAnalyticsSummary,
  getEventEngagementTimeseries,
  getEventAnalyticsByLocation
} from "../../controllers/DashboardAnalytics/eventAnalyticsController.js";

import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";

const router = express.Router();

router.get("/summary", adminAuth, requireRole("super_admin", "admin"), getEventAnalyticsSummary);
router.get("/engagement", adminAuth, requireRole("super_admin", "admin"), getEventEngagementTimeseries);
router.get("/by-location", adminAuth, requireRole("super_admin", "admin"), getEventAnalyticsByLocation);


export default router;
