import express from "express";
import {
  googleLogin,
  googleCallback,
  getMe
} from "../../controllers/auth/googleAuthController.js";
import userAuth from "../../middleware/userAuth.js";

const router = express.Router();

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/auth/me", userAuth,getMe)
export default router;
