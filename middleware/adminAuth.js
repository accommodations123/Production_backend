import jwt from "jsonwebtoken";
import Admin from "../model/Admin.js";
import { getCache, setCache } from "../services/cacheService.js";

/* =====================================================================
   Admin Authentication Middleware — Production-Ready
   - Verifies JWT from Authorization header
   - Checks account status (active/suspended/deactivated)
   - Checks lockout status
   - Uses Redis cache with DB fallback
   - Graceful Redis failure handling
   ===================================================================== */

const ADMIN_ROLES = ["super_admin", "admin", "recruiter"];
const CACHE_TTL = 600;                             // 10 minutes

/**
 * Build consistent cache key for admin by ID.
 */
function adminCacheKey(id) {
  return `admin:id:${id}`;
}

export default async function adminAuth(req, res, next) {
  try {
    // ── Extract token ───────────────────────────────────────────────
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided."
      });
    }

    // ── Verify JWT ──────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired. Please login again."
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    if (!decoded || !decoded.id || !ADMIN_ROLES.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Invalid token payload."
      });
    }

    const adminId = decoded.id;

    // ── Try Redis cache first (graceful fallback to DB) ─────────────
    let admin = null;

    try {
      admin = await getCache(adminCacheKey(adminId));
    } catch (cacheErr) {
      // Redis is down — proceed to DB. Don't crash the request.
      console.warn("⚠️  Redis cache read failed (falling back to DB):", cacheErr.message);
    }

    if (!admin) {
      // Fetch from DB (default scope excludes password, which is fine here)
      const dbAdmin = await Admin.findByPk(adminId);

      if (!dbAdmin) {
        return res.status(401).json({
          success: false,
          message: "Admin account not found"
        });
      }

      admin = {
        id: dbAdmin.id,
        name: dbAdmin.name,
        email: dbAdmin.email,
        role: dbAdmin.role,
        status: dbAdmin.status,
        failed_login_attempts: dbAdmin.failed_login_attempts,
        locked_until: dbAdmin.locked_until,
        last_login_at: dbAdmin.last_login_at
      };

      // Try to cache for next request (non-blocking)
      try {
        await setCache(adminCacheKey(adminId), admin, CACHE_TTL);
      } catch (cacheErr) {
        console.warn("⚠️  Redis cache write failed:", cacheErr.message);
      }
    }

    // ── Check account status ────────────────────────────────────────
    if (admin.status && admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${admin.status}. Contact the super admin.`
      });
    }

    // ── Check lockout ───────────────────────────────────────────────
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to too many failed login attempts."
      });
    }

    // ── Attach admin to request ─────────────────────────────────────
    req.admin = admin;
    next();

  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
}
