import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import {
  analyticsOverview,
  domainSummary,
  analyticsTimeSeries,
  funnelAnalytics,
  geoAnalytics
} from "../../controllers/DashboardAnalytics/AnalyticsController.js";

const router = express.Router();

// 🔐 SINGLE SOURCE OF TRUTH
router.use(adminAuth);

router.get("/overview", analyticsOverview);
router.get("/domain/:domain", domainSummary);
router.get("/timeseries", analyticsTimeSeries);
router.get("/funnel/:domain", funnelAnalytics);
router.get("/geo", geoAnalytics);

export default router;
