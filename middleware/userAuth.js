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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = Number(decoded.id);

    // ✅ Cache first
    const cachedUser = await getCache(`user:${userId}`);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    // 🔥 DB validation
    const dbUser = await User.findByPk(userId, {
      attributes: ["id", "verified"]
    });

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!dbUser.verified) {
      return res.status(401).json({ message: "Verify OTP first" });
    }

    const safeUser = {
      id: userId,
      role: "user"
    };

    await setCache(`user:${userId}`, safeUser, 600);
    req.user = safeUser;

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Session expired" });
  }
}
