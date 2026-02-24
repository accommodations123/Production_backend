import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAudit } from "../services/auditLogger.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// REGISTER ADMIN
export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await Admin.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    // Validate role
    const validRoles = ["super_admin", "admin", "recruiter"];
    const adminRole = validRoles.includes(req.body.role) ? req.body.role : "admin";

    const admin = await Admin.create({
      name,
      email,
      password: hashedPass,
      role: adminRole
    });

    // CACHE newly created admin
    await setCache(`admin:${email}`, {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: admin.password
    });
    // ✅ AUDIT: ADMIN REGISTERED
    logAudit({
      action: "ADMIN_REGISTERED",
      actor: { role: "system" },
      target: { type: "admin", id: admin.id },
      severity: "HIGH",
      req,
      metadata: { email }
    }).catch(console.error);

    return res.json({
      message: "Admin registered successfully",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// LOGIN ADMIN
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // CHECK CACHE FIRST
    let admin = await getCache(`admin:${email}`);

    if (!admin) {
      // NOT IN CACHE → get from DB
      admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        // ❌ FAILED LOGIN — MUST LOG
        logAudit({
          action: "ADMIN_LOGIN_FAILED",
          actor: { role: "system" },
          target: { type: "admin_email", id: null },
          severity: "HIGH",
          req,
          metadata: { email, reason: "admin_not_found" }
        }).catch(console.error);
        return res.status(400).json({ message: "Admin not found" });
      }

      // STORE IN CACHE
      await setCache(`admin:${email}`, {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: admin.role || "admin"
      });
    }

    const checkPass = await bcrypt.compare(password, admin.password);
    if (!checkPass) {
      // ❌ WRONG PASSWORD — MUST LOG
      logAudit({
        action: "ADMIN_LOGIN_FAILED",
        actor: { id: admin.id, role: "admin" },
        target: { type: "admin", id: admin.id },
        severity: "HIGH",
        req,
        metadata: { reason: "invalid_password" }
      }).catch(console.error);
      return res.status(400).json({ message: "Invalid password" });
    }

    const adminRole = admin.role || "admin";

    const token = jwt.sign(
      { id: admin.id, role: adminRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // ✅ SUCCESSFUL ADMIN LOGIN
    logAudit({
      action: "ADMIN_LOGIN_SUCCESS",
      actor: { id: admin.id, role: "admin" },
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
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: adminRole
      }
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
