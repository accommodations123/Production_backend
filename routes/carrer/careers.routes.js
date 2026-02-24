import express from "express";

import userAuth from "../../middleware/userAuth.js";
import adminAuth from "../../middleware/adminAuth.js";
import requireRole from "../../middleware/requireRole.js";
import uploadResume from "../../middleware/uploads/uploadResume.js";

import { createJob, getMyJobs, getJobs, getJobById, } from "../../controllers/carrer/jobController.js";

import { applyJob, updateApplicationStatus, getMyApplications, updateJobStatus, getAllApplications, getAdminApplicationById, notifyApplicationUser } from "../../controllers/carrer/applicationController.js";

const router = express.Router();

/* =====================================================
   PUBLIC ROUTES (NO AUTH)
===================================================== */

router.get("/jobs", getJobs);
router.get("/jobs/:id", getJobById);

/* =====================================================
   USER ROUTES (COOKIE AUTH)
===================================================== */

router.post("/applications", userAuth, uploadResume.single("resume"), applyJob);

router.get("/applications/me", userAuth, getMyApplications);

/* =====================================================
   ADMIN ROUTES (BEARER AUTH)
===================================================== */

router.post("/admin/jobs", adminAuth, requireRole("super_admin", "admin", "recruiter"), createJob);
router.get("/admin/jobs", adminAuth, requireRole("super_admin", "admin", "recruiter"), getMyJobs);
router.patch("/admin/jobs/:id/status", adminAuth, requireRole("super_admin", "admin", "recruiter"), updateJobStatus);
router.patch("/admin/applications/:id/status", adminAuth, requireRole("super_admin", "admin", "recruiter"), updateApplicationStatus);
router.get("/admin/applications", adminAuth, requireRole("super_admin", "admin", "recruiter"), getAllApplications);
router.get("/admin/applications/:id", adminAuth, requireRole("super_admin", "admin", "recruiter"), getAdminApplicationById);
router.post("/applications/:id/notify", adminAuth, requireRole("super_admin", "admin", "recruiter"), notifyApplicationUser);
export default router;
