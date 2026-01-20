import express from "express";
import {
  getEventAnalyticsSummary,
  getEventEngagementTimeseries,
  getEventAnalyticsByLocation
} from "../../controllers/DashboardAnalytics/eventAnalyticsController.js";

import  adminAuth  from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/summary", adminAuth, getEventAnalyticsSummary);
router.get("/engagement", adminAuth, getEventEngagementTimeseries);
router.get("/by-location", adminAuth, getEventAnalyticsByLocation);


export default router;
