import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAudit } from "../services/auditLogger.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

/* =====================================================================
   Constants
   ===================================================================== */

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = "24h";
const ADMIN_CACHE_TTL = 600;                     // 10 minutes

// Password policy — min 8 chars, 1 upper, 1 lower, 1 number, 1 special
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =====================================================================
   Helpers
   ===================================================================== */

/**
 * Build a safe admin object (no password, no sensitive internals).
 */
function safeAdminPayload(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    last_login_at: admin.last_login_at || null
  };
}

/**
 * Cache key for admin by ID.
 */
function adminCacheKey(id) {
  return `admin:id:${id}`;
}

/* =====================================================================
   REGISTER ADMIN
   POST /admin/register
   Requires: adminAuth + requireRole("super_admin")
   ===================================================================== */

export const adminRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ── Input validation ────────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 100 characters"
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      });
    }

    // ── Role restriction ────────────────────────────────────────────
    // super_admin can only be created via seed script, not API
    const ALLOWED_API_ROLES = ["admin", "recruiter"];
    const adminRole = ALLOWED_API_ROLES.includes(role) ? role : "admin";

    if (role === "super_admin") {
      logAudit({
        action: "ADMIN_REGISTER_BLOCKED",
        actor: { id: req.admin?.id, role: req.admin?.role },
        target: { type: "admin", id: null },
        severity: "CRITICAL",
        req,
        metadata: { email, attempted_role: "super_admin" }
      }).catch(console.error);

      return res.status(403).json({
        success: false,
        message: "Cannot create super_admin accounts via API"
      });
    }

    // ── Check duplicate ─────────────────────────────────────────────
    const exists = await Admin.unscoped().findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    // ── Create admin ────────────────────────────────────────────────
    const hashedPass = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const admin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPass,
      role: adminRole,
      status: "active"
    });

    // Cache the admin (without password)
    const payload = safeAdminPayload(admin);
    await setCache(adminCacheKey(admin.id), payload, ADMIN_CACHE_TTL);

    // ── Audit log ───────────────────────────────────────────────────
    logAudit({
      action: "ADMIN_REGISTERED",
      actor: { id: req.admin?.id, role: req.admin?.role },
      target: { type: "admin", id: admin.id },
      severity: "HIGH",
      req,
      metadata: { email: admin.email, role: adminRole, created_by: req.admin?.email }
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: payload
    });

  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/* =====================================================================
   LOGIN ADMIN
   POST /admin/login
   ===================================================================== */

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // ── Find admin (include password via scope) ─────────────────────
    const admin = await Admin.scope("withPassword").findOne({
      where: { email: email.toLowerCase().trim() }
    });

    if (!admin) {
      // ❌ Admin not found — generic message to prevent enumeration
      logAudit({
        action: "ADMIN_LOGIN_FAILED",
        actor: { role: "unknown" },
        target: { type: "admin_email", id: null },
        severity: "HIGH",
        req,
        metadata: { email, reason: "account_not_found" }
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // ── Check account status ────────────────────────────────────────
    if (admin.status !== "active") {
      logAudit({
        action: "ADMIN_LOGIN_BLOCKED",
        actor: { id: admin.id, role: admin.role },
        target: { type: "admin", id: admin.id },
        severity: "HIGH",
        req,
        metadata: { reason: `account_${admin.status}` }
      }).catch(console.error);

      return res.status(403).json({
        success: false,
        message: "Account is suspended or deactivated. Contact the super admin."
      });
    }

    // ── Check lockout ───────────────────────────────────────────────
    if (admin.isLocked()) {
      const retryAfter = Math.ceil((new Date(admin.locked_until) - new Date()) / 1000);

      logAudit({
        action: "ADMIN_LOGIN_LOCKED",
        actor: { id: admin.id, role: admin.role },
        target: { type: "admin", id: admin.id },
        severity: "HIGH",
        req,
        metadata: { locked_until: admin.locked_until }
      }).catch(console.error);

      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retry_after_seconds: retryAfter
      });
    }

    // ── Verify password ─────────────────────────────────────────────
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // Increment failed attempts (auto-locks after 5)
      const attempts = await admin.incrementFailedAttempts();

      logAudit({
        action: "ADMIN_LOGIN_FAILED",
        actor: { id: admin.id, role: admin.role },
        target: { type: "admin", id: admin.id },
        severity: "HIGH",
        req,
        metadata: {
          reason: "invalid_password",
          failed_attempts: attempts
        }
      }).catch(console.error);

      // Generic message — don't reveal "wrong password" vs "not found"
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // ── Successful login ────────────────────────────────────────────
    // Reset failed attempts
    await admin.resetFailedAttempts();

    // Record last login
    await admin.recordLogin();

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Set HTTP-only cookie
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000                // 24 hours
    });

    // Cache admin data (no password)
    const payload = safeAdminPayload(admin);
    await setCache(adminCacheKey(admin.id), payload, ADMIN_CACHE_TTL);

    // Audit log
    logAudit({
      action: "ADMIN_LOGIN_SUCCESS",
      actor: { id: admin.id, role: admin.role },
      target: { type: "admin", id: admin.id },
      severity: "MEDIUM",
      req,
      metadata: {
        email: admin.email,
        login_method: "password",
        source: "admin_panel"
      }
    }).catch(console.error);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      data: payload
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/* =====================================================================
   CHANGE PASSWORD
   PUT /admin/change-password
   Requires: adminAuth
   ===================================================================== */

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (!PASSWORD_REGEX.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    // Get admin with password
    const admin = await Admin.scope("withPassword").findByPk(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, admin.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash and update
    const hashedPass = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await admin.update({
      password: hashedPass,
      password_changed_at: new Date()
    });

    // Invalidate cache
    await deleteCache(adminCacheKey(admin.id));

    // Audit
    logAudit({
      action: "ADMIN_PASSWORD_CHANGED",
      actor: { id: admin.id, role: admin.role },
      target: { type: "admin", id: admin.id },
      severity: "HIGH",
      req,
      metadata: { email: admin.email }
    }).catch(console.error);

    return res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/* =====================================================================
   LIST ADMINS
   GET /admin/admins
   Requires: adminAuth + requireRole("super_admin")
   ===================================================================== */

export const listAdmins = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await Admin.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (err) {
    console.error("List admins error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


/* =====================================================================
   LOGOUT ADMIN
   POST /admin/logout
   ===================================================================== */

export const adminLogout = async (req, res) => {
  try {
    // Clear HTTP-only cookie
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax"
    });

    // Invalidate cache if admin is authenticated
    if (req.admin?.id) {
      await deleteCache(adminCacheKey(req.admin.id));

      logAudit({
        action: "ADMIN_LOGOUT",
        actor: { id: req.admin.id, role: req.admin.role },
        target: { type: "admin", id: req.admin.id },
        severity: "LOW",
        req,
        metadata: { email: req.admin.email }
      }).catch(console.error);
    }

    return res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
