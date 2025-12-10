import dotenv from "dotenv";
dotenv.config();

import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../model/User.js';
import { getCache, setCache } from "../services/cacheService.js";

// Email Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// SEND OTP
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const otp = generateOTP();

    // store OTP in Redis instead of DB fields
    const key = `otp:${email}`;
    await setCache(key, otp, 300); // expires in 5 minutes

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({ email, verified: false });
    } else {
      user.verified = false;
      await user.save();
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <h2>Your OTP: ${otp}</h2>
        <p>This OTP is valid for 5 minutes.</p>
      `
    });

    return res.json({ message: "OTP sent to email" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


// VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const key = `otp:${email}`;
    const expected = await getCache(key);

    if (!expected) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (expected !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verified = true;
    await user.save();

    const token = jwt.sign(
      { id: user.id, role: "user" },
      process.env.JWT_SECRET
    );

    return res.json({
      message: 'OTP Verified',
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

