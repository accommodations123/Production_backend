import express from "express";
import {
  getBuySellOverview,
  getBuySellDailyTrend,
  getBuySellByCountry,
  getBuySellApprovalRatio
} from "../../controllers/DashboardAnalytics/buySellAnalyticsController.js";
import adminAuth from "../../middleware/adminAuth.js";

const router = express.Router();

router.use(adminAuth);

router.get("/overview",adminAuth, getBuySellOverview);
router.get("/trend",adminAuth, getBuySellDailyTrend);
router.get("/country",adminAuth, getBuySellByCountry);
router.get("/ratio",adminAuth, getBuySellApprovalRatio);

export default router;
