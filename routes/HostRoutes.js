import express from "express";
import userauth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  saveHost,
  getMyHost,
  updateHost,
  getPendingHosts,
  approveHost,
  rejectHost,
  getApprovedHosts,
  getRejectedHosts
} from "../controllers/HostController.js";
import { uploadHostDocs, uploadHostProfile } from "../middleware/upload.js";
import { multerErrorHandler } from '../middleware/uploads/multerErrorHandler.js'
import { auditContext } from "../middleware/auditContext.js";
const router = express.Router();

router.post("/save", userauth, auditContext("user"), uploadHostDocs.fields([{ name: "idPhoto", maxCount: 1 }, { name: "selfiePhoto", maxCount: 1 }]), multerErrorHandler, saveHost);
router.put("/update/:id", userauth, auditContext("user"), uploadHostProfile.single("profile_image"), multerErrorHandler, updateHost);
// Get logged-in user's host verification details
router.get("/get", userauth, auditContext("user"), getMyHost);
router.get("/admin/hosts/pending", adminAuth, auditContext("admin"), getPendingHosts)
router.put("/admin/hosts/approve/:id", adminAuth, auditContext("admin"), approveHost)
router.put("/admin/hosts/reject/:id", adminAuth, auditContext("admin"), rejectHost)
router.get("/admin/hosts/approved", adminAuth, auditContext("admin"), getApprovedHosts);
router.get("/admin/hosts/rejected", adminAuth, auditContext("admin"), getRejectedHosts);
export default router;
