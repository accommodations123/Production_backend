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

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        verified: false,
        otp,
        otpExpires: expiresAt,
      });
    } else {
      user.verified = false;
      user.otp = otp;
      user.otpExpires = expiresAt;
      await user.save();
    }

    await setCache(`otp:${email}`, { otp, expiresAt }, 300);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Verification Code",
      html: `<h2>Your OTP: ${otp}</h2><p>Valid for 5 minutes.</p>`,
    });

    return res.json({ message: "OTP sent to email" });

  } catch (error) {
    console.log("SEND OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   VERIFY OTP
============================================================ */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    // Check Redis first
    const cached = await getCache(`otp:${email}`);

    if (cached) {
      const { otp: cachedOtp, expiresAt } = cached;

      if (new Date(expiresAt) < new Date())
        return res.status(400).json({ message: "OTP expired or invalid" });

      if (cachedOtp !== otp)
        return res.status(400).json({ message: "Invalid OTP" });

      const user = await User.findOne({ where: { email } });
      user.verified = true;
      user.otp = null;
      user.otpExpires = null;
      await user.save();

      await deleteCache(`otp:${email}`);

      const token = jwt.sign({ id: user.id, role: "user" }, process.env.JWT_SECRET);

      return res.json({
        message: "OTP Verified",
        token,
        user: { id: user.id, email: user.email, verified: true }
      });
    }

    // Fallback to DB
    const user = await User.findOne({ where: { email } });

    if (!user || !user.otp || new Date(user.otpExpires) < new Date())
      return res.status(400).json({ message: "OTP expired or invalid" });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    await deleteCache(`otp:${email}`);

    const token = jwt.sign({ id: user.id, role: "user" }, process.env.JWT_SECRET);

    return res.json({
      message: "OTP Verified",
      token,
      user: { id: user.id, email: user.email, verified: true }
    });

  } catch (error) {
    console.log("VERIFY OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
