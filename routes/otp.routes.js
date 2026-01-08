import express from 'express'
import {sendOTP,verifyOTP } from '../controllers/otp.controller.js'
import {rateLimit} from '../middleware/rateLimiter.js'
const router = express.Router()
router.post('/send-otp',rateLimit,sendOTP)
router.post('/verify-otp',rateLimit,verifyOTP)
// router.post('/logout',logout)
export default router