import express from "express";

import userAuth from "../../middleware/userAuth.js";
import adminAuth from "../../middleware/adminAuth.js";
import uploadResume from "../../middleware/uploads/uploadResume.js";

import {createJob,getMyJobs,getJobs,getJobById,} from "../../controllers/carrer/jobController.js";

import {applyJob,updateApplicationStatus,getMyApplications,updateJobStatus,getAllApplications,getAdminApplicationById,notifyApplicationUser} from "../../controllers/carrer/applicationController.js";

const router = express.Router();

/* =====================================================
   PUBLIC ROUTES (NO AUTH)
===================================================== */

router.get("/jobs", getJobs);
router.get("/jobs/:id", getJobById);

/* =====================================================
   USER ROUTES (COOKIE AUTH)
===================================================== */

router.post("/applications",userAuth,uploadResume.single("resume"),applyJob);

router.get("/applications/me",userAuth,getMyApplications);

/* =====================================================
   ADMIN ROUTES (BEARER AUTH)
===================================================== */

router.post("/admin/jobs",adminAuth,createJob);
router.get("/admin/jobs", adminAuth, getMyJobs);
router.patch("/admin/jobs/:id/status",adminAuth,updateJobStatus);
router.patch("/admin/applications/:id/status",adminAuth,updateApplicationStatus);
router.get("/admin/applications",adminAuth,getAllApplications);
router.get("/admin/applications/:id",adminAuth,getAdminApplicationById);
router.post("/applications/:id/notify",adminAuth,notifyApplicationUser);
export default router;
