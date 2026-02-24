import express from "express";
import userAuth from "../../middleware/userAuth.js";
import {
  createCommunity,
  updateCommunityProfile,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  getCommunityHostMembers,
  listCommunities,
  getNearbyEvents,
  getPendingCommunities,
  approveCommunity,
  rejectCommunity,
  suspendCommunity,
  activateCommunity,
  getApprovedCommunities,
  getRejectedCommunities,
  getSuspendedCommunities
} from "../../controllers/community/communityController.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
import { uploadCommunityMedia } from "../../middleware/uploads/community.upload.js";
import { multerErrorHandler } from '../../middleware/uploads/multerErrorHandler.js'
import optionalAuth from "../../middleware/joinleaveAuth.js";
const router = express.Router();

router.post("/", userAuth, createCommunity);
router.put('/:id/update', userAuth, uploadCommunityMedia.fields([{ name: "avatar_image", maxcount: 1 }, { name: "cover_image", maxcount: 1 }]), multerErrorHandler, updateCommunityProfile)
router.get("/", listCommunities);
router.get("/:id", optionalAuth, getCommunityById);
router.post("/:id/join", userAuth, optionalAuth, joinCommunity);
router.post("/:id/leave", userAuth, optionalAuth, leaveCommunity);
router.get("/:id/hosts", optionalAuth, getCommunityHostMembers);
router.get("/:id/nearby-events", getNearbyEvents);


// Admin Routes
router.get('/admin/communities/pending', adminAuth, requireRole("super_admin", "admin"), getPendingCommunities)
router.put('/admin/communities/:id/approve', adminAuth, requireRole("super_admin", "admin"), approveCommunity)
router.put('/admin/communities/:id/reject', adminAuth, requireRole("super_admin", "admin"), rejectCommunity)
router.put('/admin/communities/:id/suspend', adminAuth, requireRole("super_admin", "admin"), suspendCommunity)
router.post('/admin/communities/:id/activate', adminAuth, requireRole("super_admin", "admin"), activateCommunity)
router.get("/admin/communities/approved", adminAuth, requireRole("super_admin", "admin"), getApprovedCommunities);
router.get("/admin/communities/rejected", adminAuth, requireRole("super_admin", "admin"), getRejectedCommunities);
router.get("/admin/communities/suspended", adminAuth, requireRole("super_admin", "admin"), getSuspendedCommunities);

export default router;
