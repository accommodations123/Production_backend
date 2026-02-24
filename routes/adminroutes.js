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

/* =====================================================================
   Stricter rate limiter for login — 5 attempts per 15 minutes per IP.
   Falls back to general rateLimit for other routes.
   ===================================================================== */
import { RateLimiterMemory } from "rate-limiter-flexible";

const loginLimiter = new RateLimiterMemory({
    points: 5,                                     // 5 attempts
    duration: 15 * 60,                             // per 15 minutes
    blockDuration: 15 * 60                         // block for 15 min after exceeding
});

const loginRateLimit = async (req, res, next) => {
    try {
        const key = req.ip || req.connection.remoteAddress;
        await loginLimiter.consume(key);
        next();
    } catch {
        return res.status(429).json({
            success: false,
            message: "Too many login attempts. Try again in 15 minutes."
        });
    }
};

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

/* =====================================================================
   ⚠️ TEMPORARY: One-time seed route for first super admin.
   DELETE THIS ROUTE after creating your super admin!
   ===================================================================== */
import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";

router.post("/seed-super-admin", rateLimit, async (req, res) => {
    try {
        // Sync table first — adds new columns if they don't exist
        await Admin.sync({ alter: true });

        // Check if any super_admin already exists
        const existing = await Admin.unscoped().findOne({
            where: { role: "super_admin" }
        });

        if (existing) {
            return res.status(403).json({
                success: false,
                message: "Super admin already exists. This route is disabled."
            });
        }

        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "name, email, and password are required"
            });
        }

        const hashedPass = await bcrypt.hash(password, 12);
        const admin = await Admin.create({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPass,
            role: "super_admin",
            status: "active"
        });

        return res.status(201).json({
            success: true,
            message: "Super admin created! DELETE this route now.",
            admin: { id: admin.id, email: admin.email, role: admin.role }
        });
    } catch (err) {
        console.error("Seed error:", err);
        return res.status(500).json({ success: false, message: "Failed to seed" });
    }
});

export default router;