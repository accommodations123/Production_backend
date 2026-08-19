import express from "express";
import {
    adminRegister,
    adminLogin,
    changePassword,
    listAdmins,
    adminLogout,
    getMe
} from "../controllers/admin.js";
import { rateLimit, adminLoginRateLimit } from "../middleware/rateLimiter.js";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// 🔐 Login — strict rate limit, no auth required
router.post("/login", adminLoginRateLimit, adminLogin);

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

// 🔐 Get own profile — any authenticated admin
router.get("/me", adminAuth, getMe);

export default router;