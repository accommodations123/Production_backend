import express from "express";
import userAuth from "../../middleware/userAuth.js";
import {
  createCommunity,
  updateCommunityProfile,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  getNearbyEvents,
  getPendingCommunities,
  approveCommunity,
  rejectCommunity,
  suspendCommunity,
  activateCommunity
} from "../../controllers/community/communityController.js";
import adminAuth from "../../middleware/adminAuth.js";
import { uploadCommunityMedia } from "../../middleware/uploads/community.upload.js";
import {multerErrorHandler} from '../../middleware/uploads/multerErrorHandler.js'

const router = express.Router();

router.post("/", userAuth, createCommunity);
router.put('/:id/update',userAuth,uploadCommunityMedia.fields([{name: "avatar_image", maxcount:1},{name: "cover_image", maxcount:1}]),multerErrorHandler, updateCommunityProfile)
router.get("/", listCommunities);
router.get("/:id", getCommunityById);
router.post("/:id/join", userAuth, joinCommunity);
router.post("/:id/leave", userAuth, leaveCommunity);
router.get("/:id/nearby-events", getNearbyEvents);


// Admin Routes
router.get('/admin/communities/pending',adminAuth,getPendingCommunities)
router.put('/admin/communities/:id/approve',adminAuth,approveCommunity)
router.put('/admin/communities/:id/reject',adminAuth,rejectCommunity)
router.put('/admin/communities/:id/suspend',adminAuth,suspendCommunity)
router.post('/admin/communities/:id/activate',adminAuth,activateCommunity)
export default router;
