import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../model/User.js";

import redis from "../config/redis.js";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

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

/* ============================================================
   SEND OTP
============================================================ */
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    // RATE LIMIT
    try {
      await otpLimiter.consume(email);
    } catch {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const [user] = await User.findOrCreate({
      where: { email },
      defaults: {
        verified: false,
        otp,
        otpExpires: expiresAt
      }
    });

    if (!user.isNewRecord) {
      user.otp = otp;
      user.otpExpires = expiresAt;
      user.verified = false;
      await user.save();
    }

    // await setCache(`otp:${email}`, { otp, expiresAt }, 300);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 420px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #111827; margin-bottom: 10px;">Verify Your Account</h2>

    <p style="color: #374151; font-size: 14px; line-height: 1.5;">
      Use the one-time password below to complete your verification.
    </p>

    <div style="margin: 24px 0; text-align: center;">
      <span style="
        display: inline-block;
        padding: 14px 24px;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 4px;
        color: #111827;
        background: #f3f4f6;
        border-radius: 6px;
      ">
        ${otp}
      </span>
    </div>

    <p style="color: #6b7280; font-size: 13px;">
      This code is valid for <strong>5 minutes</strong>.
      Do not share it with anyone.
    </p>

    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
      If you did not request this code, you can safely ignore this email.
    </p>
  </div>
`

    });

    return res.json({ message: "OTP sent to email" });

  } catch (error) {
    console.log("SEND OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


/* ============================================================
   VERIFY OTP (PRODUCTION)
============================================================ */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const user = await User.findOne({ where: { email } });

    if (
      !user ||
      !user.otp ||
      new Date(user.otpExpires) < new Date() ||
      user.otp !== otp
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // ✅ Mark user verified
    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // ✅ Generate JWT (SERVER ONLY)
    const token = jwt.sign(
      { id: user.id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Set secure cookie (single source of truth)
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      domain: isProd ? ".test.nextkinlife.live" : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    // ❌ NEVER return token to frontend
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


