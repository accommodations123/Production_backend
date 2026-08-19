// routes/admin/adminAnalytics.routes.js
import express from "express";
import {
  getJobsOverview,
  getApplicationsFunnel,
  getApplicationsDailyTrend,
  getMostViewedJobs,
  getAdminActionsSummary
} from "../../controllers/DashboardAnalytics/carrerAnalytics.controller.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
const router = express.Router();

router.get("/jobs/overview", adminAuth, requireRole("super_admin", "admin", "recruiter"), getJobsOverview);
router.get("/applications/funnel", adminAuth, requireRole("super_admin", "admin", "recruiter"), getApplicationsFunnel);
router.get("/applications/trend", adminAuth, requireRole("super_admin", "admin", "recruiter"), getApplicationsDailyTrend);
router.get("/jobs/top-viewed", adminAuth, requireRole("super_admin", "admin", "recruiter"), getMostViewedJobs);
router.get("/admin/actions", adminAuth, requireRole("super_admin", "admin", "recruiter"), getAdminActionsSummary);

export default router;
