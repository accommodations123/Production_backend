import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";

import {
  getCommunityOverview,
  getCommunityDailyTrend,
  getCommunityByCountry,
  getCommunityApprovalRatio,
  getCommunityMembershipActivity
} from "../../controllers/DashboardAnalytics/communityAnalytics.controller.js";

const router = express.Router();

/* ======================================================
   COMMUNITY ANALYTICS – ADMIN ROUTES
====================================================== */

/**
 * OVERVIEW
 * /admin/analytics/communities/overview?range=7d|30d|90d
 */
router.get("/communities/overview", adminAuth, requireRole("super_admin", "admin"), getCommunityOverview);

/**
 * DAILY TREND
 * /admin/analytics/communities/trend?range=7d|30d
 */
router.get("/communities/trend", adminAuth, requireRole("super_admin", "admin"), getCommunityDailyTrend);

/**
 * COUNTRY DISTRIBUTION
 * /admin/analytics/communities/countries
 */
router.get("/communities/countries", adminAuth, requireRole("super_admin", "admin"), getCommunityByCountry);

/**
 * APPROVAL VS REJECTION
 * /admin/analytics/communities/approval-ratio
 */
router.get("/communities/approval-ratio", adminAuth, requireRole("super_admin", "admin"), getCommunityApprovalRatio);

/**
 * MEMBERSHIP ACTIVITY (JOIN vs LEAVE)
 * /admin/analytics/communities/memberships
 */
router.get("/communities/memberships", adminAuth, requireRole("super_admin", "admin"), getCommunityMembershipActivity);

export default router;
