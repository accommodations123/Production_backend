import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
import {
  getPendingStayRequests,
  getAdminStayRequestStats,
  approveStayRequest,
  rejectStayRequest,
  getAdminStayRequestReports
} from "../../controllers/stayRequest/StayRequest.controllers.js";

const router = express.Router();

/* ── ADMIN FLOW ───────────────────────────────────────────── */
router.get("/pending", adminAuth, requireRole("super_admin", "admin"), getPendingStayRequests);
router.get("/statistics", adminAuth, requireRole("super_admin", "admin"), getAdminStayRequestStats);
router.put("/approve/:id", adminAuth, requireRole("super_admin", "admin"), approveStayRequest);
router.put("/reject/:id", adminAuth, requireRole("super_admin", "admin"), rejectStayRequest);
router.get("/reports", adminAuth, requireRole("super_admin", "admin"), getAdminStayRequestReports);

export default router;
