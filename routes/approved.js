import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {getApprovedList,getApprovedWithHosts  } from "../controllers/Approved.js";

const router = express.Router();

// Admin approves a property by its ID
router.get("/get",getApprovedList)
router.get("/approved-host-details", getApprovedWithHosts)

export default router;
