import express from "express";
import userauth from "../middleware/userAuth.js";
import adminAuth from "../middleware/adminAuth.js";
import {
  saveHost,
  getMyHost,
  updateHost,
  getPendingHosts,
  approveHost,
  rejectHost
 
} from "../controllers/HostController.js";
import { upload } from "../middleware/upload.js"; 
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'

const router = express.Router();



router.post("/save",userauth,upload.fields([{ name: "idPhoto", maxCount: 1 },{ name: "selfiePhoto", maxCount: 1 }]),multerErrorHandler,saveHost);
router.put("/update/:id",userauth,upload.fields([{ name: "idPhoto", maxCount: 1 },{ name: "selfiePhoto", maxCount: 1 }]),multerErrorHandler,updateHost);
// Get logged-in user's host verification details
router.get("/get", userauth, getMyHost);
router.get("/admin/hosts/pending",adminAuth,getPendingHosts)
router.put("/admin/hosts/approve/:id",adminAuth,approveHost)
router.put("/admin/hosts/reject/:id",adminAuth,rejectHost)





export default router;
