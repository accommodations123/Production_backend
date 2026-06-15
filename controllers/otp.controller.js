import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../model/User.js";
import bcrypt from "bcryptjs";
import { RateLimiterMemory } from "rate-limiter-flexible";
import crypto from "crypto";

const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
};

import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { attachCloudFrontUrl } from "../utils/imageUtils.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import geoip from "geoip-lite";

// Email Transporter (with connection pooling enabled for high scale throughput)
const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getCountry = (req) => {
  try {
    if (req.headers["x-country"]) return req.headers["x-country"];
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    const geo = ip ? geoip.lookup(ip) : null;
    return geo?.country || null;
  } catch (err) {
    console.error("GeoIP lookup error:", err.message);
    return null;
  }
};

/* ============================================================
   SEND OTP
 ============================================================ */
export const sendOTP = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Request body missing" });
    }

    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    email = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Query by email GSI
    const users = await User.query("email").eq(email).exec();
    let user = users.length > 0 ? users[0] : null;

    if (user) {
      await User.update({ id: user.id }, { otp: hashedOtp, otp_expires: expiresAt, otp_attempts: 0 });
    } else {
      user = await User.create({
        email,
        verified: false,
        otp: hashedOtp,
        otp_expires: expiresAt,
        otp_attempts: 0
      });

      // ✅ Only log USER_REGISTERED for brand new users
      AnalyticsEvent.create({
        event_type: "USER_REGISTERED",
        user_id: user.id,
        country: getCountry(req)
      }).catch(console.error);
    }

    // Direct SMTP send in background (non-blocking) to prevent thread stall
    setImmediate(() => {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Verification Code",
        html: `
          <div style="font-family: Arial; max-width: 420px; margin: auto;">
            <h2>Verify Your Account</h2>
            <p>Your OTP is:</p>
            <h1 style="letter-spacing: 6px;">${otp}</h1>
            <p>This code is valid for 5 minutes.</p>
          </div>
        `
      }).then(() => {
        console.log(`✅ [OTP] Email sent to: ${email}`);
      }).catch((mailError) => {
        console.error("⚠️ Mailer Error (OTP still saved, check console):", otp, mailError.message);
      });
    });

    // ✅ Log OTP_SENT for every OTP request
    AnalyticsEvent.create({
      event_type: "OTP_SENT",
      user_id: user.id,
      country: getCountry(req)
    }).catch(console.error);

    logAudit({
      action: "OTP_SENT",
      actor: { role: "system" },
      target: { type: "user_email", id: null },
      severity: "LOW",
      req,
      metadata: { email }
    }).catch(console.error);

    return res.json({ message: "OTP sent to email" });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



/* ============================================================
   VERIFY OTP (PRODUCTION)
============================================================ */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    // Query by email GSI
    const users = await User.query("email").eq(email).exec();
    const user = users.length > 0 ? users[0] : null;

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check DB-level lockout
    if (user.otp_attempts >= 5) {
      return res.status(429).json({ message: "Too many failed attempts. Account locked/OTP invalidated. Please request a new OTP." });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP required" });
    }

    // Check if OTP exists
    if (!user.otp || !user.otp_expires) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    // Check if OTP expired
    if (new Date(user.otp_expires).getTime() < Date.now()) {
      logAudit({
        action: "OTP_VERIFICATION_FAILED",
        actor: { role: "system" },
        target: { type: "user", id: user?.id },
        severity: "HIGH",
        req,
        metadata: { email, reason: "expired" }
      }).catch(console.error);

      AnalyticsEvent.create({
        event_type: "OTP_VERIFICATION_FAILED",
        user_id: user?.id || null,
        country: getCountry(req)
      }).catch(console.error);

      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify hash of OTP (supports bcrypt fallback for backward compatibility)
    const cleanOtp = String(otp).trim();
    let isMatch = false;
    if (user.otp.startsWith("$2a$") || user.otp.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(cleanOtp, user.otp);
    } else {
      isMatch = hashOTP(cleanOtp) === user.otp;
    }

    if (!isMatch) {
      const newAttempts = (user.otp_attempts || 0) + 1;
      
      if (newAttempts >= 5) {
        // Destroy OTP in DB and set lockout
        await User.update({ id: user.id }, {
          $SET: { otp_attempts: newAttempts },
          $REMOVE: ["otp", "otp_expires"]
        });

        logAudit({
          action: "OTP_VERIFICATION_FAILED",
          actor: { role: "system" },
          target: { type: "user", id: user?.id },
          severity: "HIGH",
          req,
          metadata: { email, reason: "too_many_failures_locked" }
        }).catch(console.error);

        return res.status(429).json({ message: "Too many failed attempts. OTP has been invalidated. Please request a new one." });
      } else {
        await User.update({ id: user.id }, {
          $SET: { otp_attempts: newAttempts }
        });

        logAudit({
          action: "OTP_VERIFICATION_FAILED",
          actor: { role: "system" },
          target: { type: "user", id: user?.id },
          severity: "HIGH",
          req,
          metadata: { email, reason: "wrong_otp", attempt: newAttempts }
        }).catch(console.error);

        return res.status(400).json({ message: `Wrong OTP. Please check and try again. ${5 - newAttempts} attempts remaining.` });
      }
    }

    // Reset failed attempts and clear OTP upon successful verification
    await User.update({ id: user.id }, {
      $SET: { verified: true, otp_attempts: 0 },
      $REMOVE: ["otp", "otp_expires"]
    });

    const token = jwt.sign(
      { id: user.id, role: "user", token_version: user.token_version || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      domain: isProd ? ".nextkinlife.live" : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logAudit({
      action: "USER_LOGIN",
      actor: { id: user.id, role: "user" },
      target: { type: "user", id: user.id },
      severity: "LOW",
      req
    }).catch(console.error);

    // ✅ Log OTP_VERIFIED analytics event
    AnalyticsEvent.create({
      event_type: "OTP_VERIFIED",
      user_id: user.id,
      country: getCountry(req)
    }).catch(console.error);

    // ✅ Log USER_LOGIN analytics event
    AnalyticsEvent.create({
      event_type: "USER_LOGIN",
      user_id: user.id,
      country: getCountry(req)
    }).catch(console.error);

    return res.json({
      message: "OTP verified successfully",
      user: {
        id: user.id,
        email: user.email,
        verified: true
      }
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  const token = req.cookies?.access_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.id) {
        await User.update({ id: decoded.id }, { $ADD: { token_version: 1 } }).catch(() => {});
        await deleteCache(`user:${decoded.id}`).catch(() => {});
      }
    } catch { }
  }

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? ".nextkinlife.live" : undefined,
  });
  logAudit({
    action: "USER_LOGOUT",
    actor: req.auditActor,
    target: { type: "user", id: req.user?.id },
    req
  }).catch(console.error);


  return res.json({ success: true });
};


/* ============================================================
   UPDATE USER PROFILE (Generic)
============================================================ */
export const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updates = {};

    // ✅ If new profile image uploaded
    if (req.file?.key) {
      updates.profile_image = req.file.key;
    }

    // ✅ Update other fields
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;

    if (Object.keys(updates).length > 0) {
      await User.update({ id: userId }, updates);
    }

    // Refetch
    const updatedUser = await User.get(userId);

    // ✅ Audit log
    logAudit({
      action: "USER_PROFILE_UPDATED",
      actor: req.auditActor,
      target: { type: "user", id: userId },
      req,
    }).catch(console.error);

    // ✅ Invalidate caches
    await deleteCacheByPrefix(`user:${userId}`);
    await deleteCacheByPrefix(`host:${userId}`);

    // ✅ Build full CloudFront image URL for response
    const profileImageUrl = updatedUser.profile_image
      ? attachCloudFrontUrl(updatedUser.profile_image)
      : null;

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profile_image: profileImageUrl,
        phone: updatedUser.phone,
      },
    });

  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
