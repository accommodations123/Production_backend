// routes/admin/adminAnalytics.routes.js
import express from "express";
import {
  getUsersOverview,
  getUserSignupTrend,
  getOtpFunnel,
  getDailyActiveUsers,
  getUsersByCountry
} from "../../controllers/DashboardAnalytics/userAnalytics.controller.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
const router = express.Router();

router.get("/analytics/overview", adminAuth, requireRole("super_admin", "admin"), getUsersOverview);
router.get("/analytics/signup-trend", adminAuth, requireRole("super_admin", "admin"), getUserSignupTrend);
router.get("/analytics/otp-funnel", adminAuth, requireRole("super_admin", "admin"), getOtpFunnel);
router.get("/analytics/daily-active", adminAuth, requireRole("super_admin", "admin"), getDailyActiveUsers);
router.get("/analytics/by-country", adminAuth, requireRole("super_admin", "admin"), getUsersByCountry);


export default router;
