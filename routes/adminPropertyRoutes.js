import express from "express";
import {
  getPendingProperties,
  approveProperty,
  rejectProperty,
  deleteProperty
} from "../controllers/adminPropertyController.js";
import adminAuth from "../middleware/adminAuth.js";
// import admin from "../middleware/admin.js";

const router = express.Router();

// Admin only
router.get("/property/:id", adminAuth, getPendingProperties);
router.get("/pending", adminAuth,  getPendingProperties);
router.put("/approve/:id", adminAuth,  approveProperty);
router.put("/reject/:id", adminAuth,  rejectProperty);
router.delete("/delete/:id", adminAuth, deleteProperty);

export default router;
