import express from "express";
import {
  getAnalyticsSummary,
  getAnalyticsTimeseries,
  getAnalyticsByLocation
} from "../../controllers/DashboardAnalytics/adminAnalyticsController.js";

import adminAuth from "../../middleware/adminAuth.js";

const router = express.Router();

router.get("/summary", adminAuth, getAnalyticsSummary);
router.get("/timeseries", adminAuth, getAnalyticsTimeseries);
router.get("/by-location", adminAuth, getAnalyticsByLocation);

export default router;
