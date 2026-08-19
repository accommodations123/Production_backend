import express from "express";
import {
  googleLogin,
  googleCallback,
  getMe
} from "../../controllers/auth/googleAuthController.js";
import { optionalUserAuth } from "../../middleware/userAuth.js";

const router = express.Router();

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", optionalUserAuth, getMe);
export default router;
