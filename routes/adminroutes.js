import express from "express";
import {
    adminRegister,
    adminLogin,
    changePassword,
    listAdmins,
    adminLogout
} from "../controllers/admin.js";
import { rateLimit } from "../middleware/rateLimiter.js";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

const loginRateLimit = (req, res, next) => next();

/* =====================================================================
   Routes
   ===================================================================== */

// 🔐 Login — strict rate limit, no auth required
router.post("/login", loginRateLimit, adminLogin);

// 🔐 Register — only super_admin can create new admin accounts
router.post(
    "/register",
    rateLimit,
    adminAuth,
    requireRole("super_admin"),
    adminRegister
);

// 🔐 Change own password — any authenticated admin
router.put(
    "/change-password",
    rateLimit,
    adminAuth,
    changePassword
);

// 🔐 List all admins — super_admin only
router.get(
    "/admins",
    rateLimit,
    adminAuth,
    requireRole("super_admin"),
    listAdmins
);

// 🔐 Logout — authenticated admin (optional auth, still works if token expired)
router.post("/logout", adminAuth, adminLogout);

export default router;