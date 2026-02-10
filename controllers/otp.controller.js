import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../model/User.js";

import redis from "../config/redis.js";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import geoip from "geoip-lite";
// OTP RATE LIMITER
let otpLimiter;

if (redis) {
  otpLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "otp_limit",
    points: 3,
    duration: 600
  });
} else {
  otpLimiter = new RateLimiterMemory({
    points: 3,
    duration: 600
  });
}

// Email Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

const getCountry = (req) => {
  if (req.headers["x-country"]) return req.headers["x-country"];
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const geo = geoip.lookup(ip);
  return geo?.country || null;
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

    /* ================= RATE LIMIT ================= */
    const rateKey = `otp:${email}:${req.ip}`;
    try {
      await otpLimiter.consume(rateKey);
    } catch {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ where: { email } });

    if (user) {
      if (!user.verified) {
        user.otp = otp;
        user.otpExpires = expiresAt;
        await user.save();
      }
    } else {
      user = await User.create({
        email,
        verified: false,
        otp,
        otpExpires: expiresAt
      });

      // ✅ Only log USER_REGISTERED for brand new users
      AnalyticsEvent.create({
        event_type: "USER_REGISTERED",
        user_id: user.id,
         country: getCountry(req)
      }).catch(console.error);
    }

    await transporter.sendMail({
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

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    /* ===============================
       CASE 1: ALREADY VERIFIED USER
    =============================== */
    if (user.verified) {
      const token = jwt.sign(
        { id: user.id, role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        domain: isProd ? ".test.nextkinlife.live" : undefined,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // ✅ Log USER_LOGIN analytics event
      AnalyticsEvent.create({
        event_type: "USER_LOGIN",
        user_id: user.id,
         country: getCountry(req)
      }).catch(console.error);

      return res.json({
        message: "User already verified",
        user: {
          id: user.id,
          email: user.email,
          verified: true
        }
      });
    }

    /* ===============================
       CASE 2: OTP VERIFICATION
    =============================== */
    if (!otp) {
      return res.status(400).json({ message: "OTP required" });
    }

    if (
      !user.otp ||
      !user.otpExpires ||
      new Date(user.otpExpires).getTime() < Date.now() ||
      String(user.otp).trim() !== String(otp).trim()
    ) {
      logAudit({
        action: "OTP_VERIFICATION_FAILED",
        actor: { role: "system" },
        target: { type: "user", id: user?.id },
        severity: "HIGH",
        req,
        metadata: { email }
      }).catch(console.error);

      // ✅ Log OTP_VERIFICATION_FAILED analytics event
      AnalyticsEvent.create({
        event_type: "OTP_VERIFICATION_FAILED",
        user_id: user?.id || null,
         country: getCountry(req)
      }).catch(console.error);

      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark verified
    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user.id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      domain: isProd ? ".test.nextkinlife.live" : undefined,
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
      await deleteCache(`user:${decoded.id}`);
    } catch { }
  }

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? ".test.nextkinlife.live" : undefined,
  });
  logAudit({
    action: "USER_LOGOUT",
    actor: req.auditActor,
    target: { type: "user", id: req.user?.id },
    req
  }).catch(console.error);


  return res.json({ success: true });
};

