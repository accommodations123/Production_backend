import jwt from "jsonwebtoken";
import User from "../model/User.js";
import { getCache, setCache } from "../services/cacheService.js";

/* ============================================================
   USER AUTH MIDDLEWARE (COOKIE ONLY)
============================================================ */

export default async function userAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const secret = process.env.JWT_USER_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // 🔐 role comes from JWT, NOT DB
    if (decoded.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = decoded.id;  // UUID string now

    let cachedUser = null;
    try {
      cachedUser = await getCache(`user:${userId}`);
    } catch (cacheErr) {
      console.warn("⚠️ User auth cache read failed, falling back to DB:", cacheErr.message);
    }

    if (cachedUser) {
      const decodedVersion = decoded.token_version || 0;
      const cachedVersion = cachedUser.token_version || 0;
      if (decodedVersion !== cachedVersion) {
        return res.status(401).json({ message: "Session expired" });
      }
      req.user = cachedUser;
      return next();
    }

    // 🔥 DB fetch
    const dbUser = await User.get(userId);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!dbUser.verified) {
      return res.status(401).json({ message: "Verify OTP first" });
    }

    const decodedVersion = decoded.token_version || 0;
    const dbVersion = dbUser.token_version || 0;
    if (decodedVersion !== dbVersion) {
      return res.status(401).json({ message: "Session expired" });
    }

    // ✅ Construct runtime user object
    const userPayload = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      profile_image: dbUser.profile_image,
      verified: dbUser.verified,
      role: "user", // 🔑 REQUIRED BY FRONTEND
      token_version: dbUser.token_version || 0
    };

    // 🧠 Cache FULL identity
    await setCache(`user:${userId}`, userPayload, 600);

    req.user = userPayload;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired" });
    }
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid session" });
  }
}

export async function optionalUserAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (token) {
      const secret = process.env.JWT_USER_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      if (decoded && decoded.id) {
        req.user = { id: decoded.id, role: decoded.role || "user" };
      }
    }
  } catch (e) {}
  next();
}

