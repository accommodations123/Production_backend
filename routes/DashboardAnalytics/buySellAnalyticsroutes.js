import express from "express";
import {
  getBuySellOverview,
  getBuySellDailyTrend,
  getBuySellByCountry,
  getBuySellApprovalRatio
} from "../../controllers/DashboardAnalytics/buySellAnalyticsController.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";

const router = express.Router();

router.use(adminAuth);
router.use(requireRole("super_admin", "admin"));

router.get("/overview", getBuySellOverview);
router.get("/trend", getBuySellDailyTrend);
router.get("/country", getBuySellByCountry);
router.get("/ratio", getBuySellApprovalRatio);

export default router;
