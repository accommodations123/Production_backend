import express from 'express'
import {sendOTP,verifyOTP,logout,updateUser } from '../controllers/otp.controller.js'
import {rateLimit} from '../middleware/rateLimiter.js'
import userAuth from '../middleware/userAuth.js';
import { auditContext } from "../middleware/auditContext.js";
import { upload } from "../middleware/upload.js"; 
const router = express.Router()
router.post('/send-otp',auditContext("public"),rateLimit,sendOTP)
router.post('/verify-otp',auditContext("public"),rateLimit,verifyOTP)
router.post('/logout',userAuth,auditContext("user"),logout)
router.put('/update-profile', userAuth, upload.single('profile_image'), updateUser)
export default router