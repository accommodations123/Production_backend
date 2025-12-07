import dotenv from "dotenv";
dotenv.config();

import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../model/User.js';

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
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        otp,
        otp_expires: otpExpires,
        verified: false
      });
    } else {
      user.otp = otp;
      user.otp_expires = otpExpires;
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
      `,
    });

    return res.json({ message: "OTP sent to email" });

  } catch (error) {
    console.log("MAIL ERROR =>", error);
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

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otp_expires < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    user.verified = true;
    user.otp = null;
    user.otp_expires = null;
    await user.save();

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET
    );

    return res.json({
      message: 'OTP Verified',
      token,
      user: {
        email: user.email,
        id: user.id,
      }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
