import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../model/User.js";
import Host from "../../model/Host.js";
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

/* 1ï¸âƒ£ Redirect user to Google */
export const googleLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const isProd = process.env.NODE_ENV === "production";
  
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${getRedirectUri(req)}` +
    "&response_type=code" +
    `&state=${state}` +
    "&scope=openid%20email%20profile";

  res.redirect(url);
};

/* 2ï¸âƒ£ Google callback */
export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies?.oauth_state;

    // Clear state cookie
    res.clearCookie("oauth_state");

    if (!code) {
      return res.redirect("https://nextkinlife.live");
    }

    if (!state || !cookieState || state !== cookieState) {
      console.error("âŒ OAuth CSRF protection triggered: state mismatch");
      return res.status(403).send("CSRF verification failed.");
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

    const secret = process.env.JWT_USER_SECRET || process.env.JWT_SECRET;
    const token = jwt.sign(
      { id: freshUser.id, role: "user", token_version: freshUser.token_version || 0 },
      secret,
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

    // âœ… CORRECT FIX
    res.redirect("https://nextkinlife.live");
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err.response?.data || err);
    res.redirect("https://nextkinlife.live");
  }
};


export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        loggedIn: false
      });
    }

    let hostProfile = null;
    try {
      const hostRecords = await Host.scan().filter("user_id").eq(req.user.id).exec();
      if (hostRecords && hostRecords.length > 0) {
        hostProfile = hostRecords[0];
      }
    } catch (e) { }

    return res.status(200).json({
      loggedIn: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone || hostProfile?.phone || null,
        whatsapp: hostProfile?.whatsapp || req.user.whatsapp || hostProfile?.phone || null,
        instagram: hostProfile?.instagram || req.user.instagram || null,
        facebook: hostProfile?.facebook || req.user.facebook || null,
        linkedin: hostProfile?.linkedin || req.user.linkedin || null,
        twitter: hostProfile?.twitter || hostProfile?.x || req.user.twitter || null,
        host_id: hostProfile?.id || null,
        Host: hostProfile ? {
          id: hostProfile.id,
          whatsapp: hostProfile.whatsapp || null,
          phone: hostProfile.phone || null,
          instagram: hostProfile.instagram || null,
          facebook: hostProfile.facebook || null,
          linkedin: hostProfile.linkedin || null,
          twitter: hostProfile.twitter || hostProfile.x || null,
          country: hostProfile.country || null,
          city: hostProfile.city || null
        } : null,
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

