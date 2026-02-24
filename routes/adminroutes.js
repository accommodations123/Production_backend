import express from "express";
import { adminRegister, adminLogin } from "../controllers/admin.js";
import { rateLimit } from '../middleware/rateLimiter.js'
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";
const router = express.Router()
// Only super_admin can create new admin accounts
router.post('/register', rateLimit, adminAuth, requireRole("super_admin"), adminRegister)
router.post('/login', rateLimit, adminLogin)
export default router