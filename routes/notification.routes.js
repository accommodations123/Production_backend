import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/Notification.controller.js";
import userauth from "../middleware/userAuth.js";

const router = express.Router();

/* =========================
   USER NOTIFICATIONS
========================= */
router.get("/", userauth, getMyNotifications);
router.patch("/:id/read", userauth, markNotificationRead);
router.patch("/read-all", userauth, markAllNotificationsRead);

export default router;
