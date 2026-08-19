import express from "express";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
import {
  adminGetAllProfiles,
  adminGetProfileById,
  adminApproveProfile,
  adminRejectProfile,
  adminBlockProfile,
  adminUnblockProfile,
  adminFeatureProfile,
  adminVerifyProfile,
  adminForceUnpublish,
  adminDeleteProfile,
  adminGetReports,
  adminResolveReport,
  adminGetPeopleAnalytics
} from "../../controllers/people/People.controllers.js";

const router = express.Router();

// Protect all admin people routes with admin authentication & role check
router.use(adminAuth, requireRole("super_admin", "admin"));

// ═══════ Profile Management ═══════
router.get("/", adminGetAllProfiles);
router.get("/analytics", adminGetPeopleAnalytics);
router.get("/reports", adminGetReports);
router.post("/reports/:id/resolve", adminResolveReport);

router.get("/:id", adminGetProfileById);

// Approve / Accept
router.post("/:id/approve", adminApproveProfile);
router.put("/:id/approve", adminApproveProfile);
router.post("/:id/accept", adminApproveProfile);
router.put("/:id/accept", adminApproveProfile);

// Reject
router.post("/:id/reject", adminRejectProfile);
router.put("/:id/reject", adminRejectProfile);

// Block / Unblock
router.post("/:id/block", adminBlockProfile);
router.put("/:id/block", adminBlockProfile);
router.post("/:id/unblock", adminUnblockProfile);
router.put("/:id/unblock", adminUnblockProfile);

// Feature / Verify / Unpublish / Delete
router.post("/:id/feature", adminFeatureProfile);
router.put("/:id/feature", adminFeatureProfile);
router.post("/:id/verify", adminVerifyProfile);
router.post("/:id/force-unpublish", adminForceUnpublish);
router.delete("/:id", adminDeleteProfile);

export default router;
