import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  sendConnectionRequest,
  getIncomingRequests,
  getConnectionStatus,
  updateRequestStatus
} from "../controllers/connectionRequestController.js";

const router = express.Router();

// All connection request routes require user authentication
router.post("/", userAuth, sendConnectionRequest);
router.get("/incoming", userAuth, getIncomingRequests);
router.get("/status/:targetUserId", userAuth, getConnectionStatus);
router.patch("/:id/status", userAuth, updateRequestStatus);

export default router;
