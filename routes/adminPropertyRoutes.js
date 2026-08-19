import express from "express";
import {
  getPendingProperties,
  approveProperty,
  rejectProperty,
  deleteProperty,
  getApprovedPropertiesAdmin,
  getRejectedPropertiesAdmin,
  getPropertyStatusStats,  // add this
  getPropertyStats,
  getHostStats
} from "../controllers/adminPropertyController.js";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// Admin only
router.get("/pending", adminAuth, requireRole("super_admin", "admin"), getPendingProperties);
router.put("/approve/:id", adminAuth, requireRole("super_admin", "admin"), approveProperty);
router.put("/reject/:id", adminAuth, requireRole("super_admin", "admin"), rejectProperty);
router.delete("/delete/:id", adminAuth, requireRole("super_admin", "admin"), deleteProperty);
router.get("/admin/properties/approved", adminAuth, requireRole("super_admin", "admin"), getApprovedPropertiesAdmin);
router.get("/admin/properties/rejected", adminAuth, requireRole("super_admin", "admin"), getRejectedPropertiesAdmin);

// admin analytics
router.get("/stats/by-status", adminAuth, requireRole("super_admin", "admin"), getPropertyStatusStats);
router.get("/stats/by-country", adminAuth, requireRole("super_admin", "admin"), getPropertyStats);
router.get("/stats/by-hosts", adminAuth, requireRole("super_admin", "admin"), getHostStats);


export default router;
