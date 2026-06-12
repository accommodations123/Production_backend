import express from 'express'
import { sendOTP, verifyOTP, logout, updateUser } from '../controllers/otp.controller.js'
import { rateLimit, otpSendRateLimit } from '../middleware/rateLimiter.js'
import userAuth from '../middleware/userAuth.js';
import { auditContext } from "../middleware/auditContext.js";
import { uploadProfileImage } from "../middleware/upload.js";
const router = express.Router()
router.post('/send-otp', auditContext("public"), otpSendRateLimit, sendOTP)
router.post('/verify-otp', auditContext("public"), rateLimit, verifyOTP)
router.post('/logout', userAuth, auditContext("user"), logout)
router.put('/update-profile', userAuth, uploadProfileImage.single('profile_image'), updateUser)
export default router