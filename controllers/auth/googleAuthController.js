import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../../model/User.js";
import { attachCloudFrontUrl } from "../../utils/imageUtils.js";
import { deleteCache } from "../../services/cacheService.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const getRedirectUri = (req) => {
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  // Auto-correct if set to frontend callback instead of backend callback
  if (redirectUri === "https://nextkinlife.live/auth/google/callback") {
    return "https://api.nextkinlife.live/auth/google/callback";
  }
  if (redirectUri === "http://localhost:5173/auth/google/callback") {
    return "http://localhost:5000/auth/google/callback";
  }
  
  if (!redirectUri) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return `${protocol}://${req.get('host')}/auth/google/callback`;
  }
  return redirectUri;
};

/* 1️⃣ Redirect user to Google */
export const googleLogin = (req, res) => {
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${getRedirectUri(req)}` +
    "&response_type=code" +
    "&scope=openid%20email%20profile";

  res.redirect(url);
};

/* 2️⃣ Google callback */
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect("https://nextkinlife.live");
    }

    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(req),
      grant_type: "authorization_code",
      code
    });

    const { access_token } = tokenRes.data;

    const profileRes = await axios.get(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { id: googleId, email, name, picture } = profileRes.data;
    if (!email) {
      res.redirect("https://nextkinlife.live");
    }

    // Query by email GSI
    const existingUsers = await User.query("email").eq(email).exec();
    let user = existingUsers[0] || null;

    if (!user) {
      user = await User.create({
        email,
        google_id: googleId,
        name,
        profile_image: picture,
        verified: true
      });
    }

    // Invalidate cached user to prevent token version mismatch on subsequent requests
    await deleteCache(`user:${user.id}`).catch(() => {});

    // Retrieve fresh and complete user document from DynamoDB by primary key to ensure token_version is accurately loaded
    const freshUser = await User.get(user.id);

    const token = jwt.sign(
      { id: freshUser.id, role: "user", token_version: freshUser.token_version || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".nextkinlife.live",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    });

    // ✅ CORRECT FIX
    res.redirect("https://nextkinlife.live");
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err.response?.data || err);
    res.redirect("https://nextkinlife.live");
  }
};


export const getMe = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        loggedIn: false
      });
    }

    return res.status(200).json({
      loggedIn: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        profile_image: attachCloudFrontUrl(req.user.profile_image),
        role: req.user.role || "user"
      }
    });

  } catch (err) {
    console.error("GET ME ERROR:", err);
    return res.status(500).json({
      loggedIn: false,
      message: "Server error"
    });
  }
};
